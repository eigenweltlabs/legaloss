import { after, afterEach, mock, test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const directory = mkdtempSync(join(tmpdir(), "legaloss-readme-"));
process.env.DATABASE_PATH = join(directory, "test.db");
process.env.SEED_STARTERS = "0";
const { fetchCodebergReadmeText, fetchCodebergReadmeHtml } = await import("../lib/codeberg.ts");
const { ensureFreshReadme } = await import("../lib/projects.ts");
const { db, tables } = await import("../lib/db/index.ts");
const { eq } = await import("drizzle-orm");
afterEach(() => mock.restoreAll());
after(() => { db.$client.close(); rmSync(directory, { recursive: true, force: true }); });

const markdown = "# Installation\n\n![Logo](images/logo.png)\n[Guide](docs/guide.md)";
const file = () => Response.json({ type: "file", encoding: "base64", content: Buffer.from(markdown).toString("base64") });

function upstream(html = '<h1>Installation</h1><img src="images/logo.png"><a href="docs/guide.md">Guide</a>') {
  const calls = [];
  mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/contents/readme.MD")) return file();
    if (String(url).includes("/contents")) return Response.json([
      { type: "file", name: "README.txt" },
      { type: "dir", name: "README.md" },
      { type: "file", name: "readme.MD" },
    ]);
    if (url === "https://api.github.com/markdown") {
      assert.equal(JSON.parse(options.body).text, markdown);
      return new Response(html);
    }
    throw Error(`Unexpected upstream URL: ${url}`);
  });
  return calls;
}

test("discovers the real README filename and keeps the selected branch on both Forgejo requests", async () => {
  const calls = upstream();
  assert.equal(await fetchCodebergReadmeText("LACI", "laci-core", "release/testing"), markdown);
  assert.deepEqual(calls.map(call => call.url), [
    "https://codeberg.org/api/v1/repos/LACI/laci-core/contents?ref=release%2Ftesting",
    "https://codeberg.org/api/v1/repos/LACI/laci-core/contents/readme.MD?ref=release%2Ftesting",
  ]);
  assert.ok(calls.every(call => call.options.cache === "no-store"));
});

test("claim verification without a branch uses the repository default; rendered assets stay on Codeberg", async () => {
  const calls = upstream();
  assert.equal(await fetchCodebergReadmeText("LACI", "laci-core"), markdown);
  assert.equal(calls[0].url, "https://codeberg.org/api/v1/repos/LACI/laci-core/contents");
  const html = await fetchCodebergReadmeHtml("LACI", "laci-core", "testing");
  assert.match(html, /src="https:\/\/codeberg.org\/LACI\/laci-core\/raw\/branch\/testing\/images\/logo.png"/);
  assert.match(html, /href="https:\/\/codeberg.org\/LACI\/laci-core\/src\/branch\/testing\/docs\/guide.md"/);
});

test("missing README, rate limits and malformed content fail without throwing", async () => {
  for (const response of [() => Response.json([]), () => new Response("rate limited", { status: 429 }), () => new Response("not JSON")]) {
    mock.method(globalThis, "fetch", async () => response());
    assert.equal(await fetchCodebergReadmeText("owner", "repo"), null);
    mock.restoreAll();
  }
  let count = 0;
  mock.method(globalThis, "fetch", async () => ++count === 1
    ? Response.json([{ type: "file", name: "README.md" }])
    : Response.json({ type: "file", encoding: "none", content: "bad" }));
  assert.equal(await fetchCodebergReadmeText("owner", "repo"), null);
});

function project(name) {
  return db.insert(tables.projects).values({ source: "codeberg", owner: "test", repo: name, name, fullNameKey: `codeberg:test/${name}` }).returning().get();
}
function cached(id) {
  return db.select().from(tables.projectReadmes).where(eq(tables.projectReadmes.projectId, id)).get();
}

test("an already-added repository recovers immediately from a fresh null cache without overwriting custom content", async () => {
  const p = project("recover");
  const customHtml = "<p>Maintainer introduction</p>";
  db.insert(tables.projectReadmes).values({ projectId: p.id, html: null, fetchedAt: new Date(), customHtml }).run();
  const calls = upstream();
  const html = await ensureFreshReadme(p, "testing");
  assert.match(html, /Installation/);
  assert.equal(cached(p.id).html, html);
  assert.equal(cached(p.id).customHtml, customHtml);
  const requests = calls.length;
  assert.equal(await ensureFreshReadme(p, "testing"), html);
  assert.equal(calls.length, requests);
});

test("first-fetch errors are retried and failed refreshes retain the last usable README", async () => {
  const p = project("retry");
  mock.method(globalThis, "fetch", async () => new Response("unavailable", { status: 503 }));
  assert.equal(await ensureFreshReadme(p, "testing"), null);
  assert.equal(cached(p.id), undefined);
  const oldDate = new Date(Date.now() - 2 * 86400000);
  db.insert(tables.projectReadmes).values({ projectId: p.id, html: "<p>Previous README</p>", fetchedAt: oldDate }).run();
  assert.equal(await ensureFreshReadme(p, "testing"), "<p>Previous README</p>");
  assert.equal(cached(p.id).fetchedAt.getTime(), Math.floor(oldDate.getTime() / 1000) * 1000);
  mock.restoreAll();
  upstream();
  assert.match(await ensureFreshReadme(p, "testing"), /Installation/);
});
