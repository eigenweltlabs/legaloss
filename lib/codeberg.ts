import "server-only";
import { z } from "zod";

const API = "https://codeberg.org/api/v1";
const SITE = "https://codeberg.org";

export type CodebergRepo = {
  owner: string;
  repo: string;
  fullName: string;
  description: string | null;
  homepage: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  subscribers: number;
  language: string | null;
  licenseSpdx: string | null;
  licenseName: string | null;
  topics: string[];
  defaultBranch: string;
  pushedAt: Date | null;
  archived: boolean;
  isPrivate: boolean;
};

export type CodebergError = { status: number; message: string };

/** Codeberg rows use a host-qualified key so same-named GitHub repos coexist. */
export function codebergKey(owner: string, repo: string): string {
  return `codeberg:${owner}/${repo}`.toLowerCase();
}

/** Accept a Codeberg repo URL, with optional .git and trailing path segments. */
export function parseCodebergUrl(
  input: string,
): { owner: string; repo: string } | null {
  const match = input.trim().match(
    /^(?:https?:\/\/)?(?:www\.)?codeberg\.org\/([^/\s]+)\/([^/\s?#]+)(?:[/?#].*)?$/i,
  );
  if (!match) return null;
  const owner = match[1];
  const repo = match[2].replace(/\.git$/i, "");
  if (!owner || !repo || owner === "." || owner === ".." || repo === "." || repo === "..") {
    return null;
  }
  return { owner, repo };
}

export async function fetchCodebergRepo(
  owner: string,
  repo: string,
): Promise<{ data: CodebergRepo; error?: never } | { data?: never; error: CodebergError }> {
  let res: Response;
  try {
    res = await fetch(
      `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { headers: { Accept: "application/json", "User-Agent": "legaloss" }, cache: "no-store" },
    );
  } catch {
    return { error: { status: 0, message: "Codeberg couldn't be reached. Try again shortly." } };
  }
  if (!res.ok) {
    const message = res.status === 404
      ? "Repository not found on Codeberg."
      : res.status === 403 || res.status === 429
        ? "Codeberg rate limit reached. Try again shortly."
        : `Codeberg responded with ${res.status}.`;
    return { error: { status: res.status, message } };
  }

  const j = await res.json();
  const license = j.license && typeof j.license === "object" ? j.license : null;
  return {
    data: {
      owner: String(j.owner?.login ?? owner),
      repo: String(j.name ?? repo),
      fullName: String(j.full_name ?? `${j.owner?.login ?? owner}/${j.name ?? repo}`),
      description: typeof j.description === "string" && j.description ? j.description : null,
      homepage: typeof j.website === "string" && j.website ? j.website : null,
      stars: Number(j.stars_count ?? 0),
      forks: Number(j.forks_count ?? 0),
      openIssues: Number(j.open_issues_count ?? 0),
      subscribers: Number(j.watchers_count ?? 0),
      language: typeof j.language === "string" && j.language ? j.language : null,
      licenseSpdx:
        typeof license?.spdx_id === "string" && license.spdx_id !== "NOASSERTION"
          ? license.spdx_id
          : null,
      licenseName: typeof license?.name === "string" ? license.name : null,
      topics: Array.isArray(j.topics) ? j.topics.filter((t: unknown) => typeof t === "string") : [],
      defaultBranch: typeof j.default_branch === "string" && j.default_branch ? j.default_branch : "main",
      // Forgejo exposes updated_at rather than GitHub's pushed_at. Use it as
      // the available upstream freshness signal in the shared project stats.
      pushedAt: j.updated_at ? new Date(j.updated_at) : null,
      archived: Boolean(j.archived),
      isPrivate: Boolean(j.private),
    },
  };
}

/** Forgejo has no /readme endpoint. Discover the filename before reading it. */
export async function fetchCodebergReadmeText(
  owner: string,
  repo: string,
  branch?: string,
): Promise<string | null> {
  const ref = branch ? `?ref=${encodeURIComponent(branch)}` : "";
  const contents = `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents`;
  const options: RequestInit = {
    headers: { Accept: "application/json", "User-Agent": "legaloss" },
    cache: "no-store",
  };
  try {
    const listing = await fetch(`${contents}${ref}`, options);
    if (!listing.ok) return null;
    const entries = z.array(z.object({ name: z.string(), type: z.string() }))
      .parse(await listing.json());
    const candidates = entries.filter(file => file.type === "file" && /^readme(?:\.[a-z0-9]+)?$/i.test(file.name));
    const readme = candidates.find(file => /^readme\.(?:md|markdown)$/i.test(file.name)) ?? candidates[0];
    if (!readme) return null;
    const response = await fetch(`${contents}/${encodeURIComponent(readme.name)}${ref}`, options);
    if (!response.ok) return null;
    const file = z.object({ type: z.literal("file"), encoding: z.literal("base64"), content: z.string() })
      .parse(await response.json());
    return Buffer.from(file.content.replace(/\s/g, ""), "base64").toString("utf8");
  } catch {
    return null;
  }
}

/** Render Markdown through GitHub's safe renderer and point relative assets to Codeberg. */
export async function fetchCodebergReadmeHtml(
  owner: string,
  repo: string,
  branch: string,
): Promise<string | null> {
  const md = await fetchCodebergReadmeText(owner, repo, branch);
  if (!md?.trim()) return null;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "legaloss",
    "Content-Type": "application/json",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  let res: Response;
  try {
    res = await fetch("https://api.github.com/markdown", {
      method: "POST",
      headers,
      cache: "no-store",
      body: JSON.stringify({ text: md, mode: "markdown" }),
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const html = await res.text();
  const rawBase = `${SITE}/${owner}/${repo}/raw/branch/${encodeURIComponent(branch)}/`;
  const blobBase = `${SITE}/${owner}/${repo}/src/branch/${encodeURIComponent(branch)}/`;
  const href = `${SITE}/${owner}/${repo}#readme`;
  return html
    .replace(/<video[\s\S]*?(?:<\/video>|\/>)/gi,
      `<p><a class="readme-video-link" href="${href}" target="_blank" rel="noreferrer">Watch the video on Codeberg →</a></p>`,
    )
    .replace(/(<img[^>]+src=")(?!https?:|data:|\/\/)([^"]+)"/gi, (_m, pre, url) =>
      `${pre}${rawBase}${url.replace(/^\.?\//, "")}"`,
    )
    .replace(/(<a[^>]+href=")(?!https?:|#|mailto:|\/\/)([^"]+)"/gi, (_m, pre, url) =>
      `${pre}${blobBase}${url.replace(/^\.?\//, "")}"`,
    );
}
