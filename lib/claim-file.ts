import "server-only";
import { createHmac } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { projectStats } from "@/lib/db/schema";
import { fetchReadmeText } from "@/lib/github";
import { hfRepoUrl, type HfType } from "@/lib/huggingface";

/**
 * Ownership proof that needs no OAuth scopes at all: the maintainer commits a
 * token to the public repository, we read it back anonymously. The DNS-TXT
 * pattern, applied to repos.
 *
 * This exists because neither source offers a read-only "which organizations
 * am I in" scope — on Hugging Face the only way to see a user's orgs over
 * OAuth is `read-repos`, which also grants read access to their private
 * repositories. Maintainers who won't grant that (reasonably) get this path.
 */

/** Filename maintainers commit at the repository root. */
export const CLAIM_FILE_NAME = "legaloss-verify.txt";

/** Refuse to scan bodies larger than this; a proof line is never big. */
const MAX_BODY_BYTES = 1_000_000;
const FETCH_TIMEOUT_MS = 8_000;

/**
 * Signing key for claim tokens. A dedicated CLAIM_VERIFY_SECRET is preferred;
 * the Clerk secret is a safe fallback so any deployment with auth configured
 * gets working tokens without a new secret to provision. Tokens are scoped to
 * one (project, user) pair, so the derivation only has to be unguessable.
 */
function signingKey(): string {
  return (
    process.env.CLAIM_VERIFY_SECRET ??
    process.env.CLERK_SECRET_KEY ??
    "legaloss-development-claim-secret"
  );
}

/**
 * The token a specific user must publish to claim a specific project. Stable
 * across visits (no state to store or expire) and useless to anyone else: a
 * different user claiming the same repo gets a different token.
 */
export function claimToken(projectId: number, userId: string): string {
  const mac = createHmac("sha256", signingKey())
    .update(`claim:${projectId}:${userId}`)
    .digest("hex")
    .slice(0, 40);
  return `legaloss-verify-${mac}`;
}

export type FileVerification =
  | { verified: true; source: string }
  | { verified: false; reason: "file-not-found" | "file-mismatch" | "fetch-error" };

type Subject = {
  id: number;
  source: string;
  sourceType: string | null;
  owner: string;
  repo: string;
};

type Fetched = { text: string } | { error: "missing" | "network" };

async function fetchText(url: string): Promise<Fetched> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": "legaloss" },
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch {
    return { error: "network" };
  }
  if (!res.ok) return { error: "missing" };
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return { error: "missing" };
  const text = await res.text();
  return { text: text.slice(0, MAX_BODY_BYTES) };
}

/** Candidate URLs for the dedicated proof file, most likely first. */
async function proofFileUrls(project: Subject): Promise<string[]> {
  if (project.source === "huggingface") {
    const base = hfRepoUrl(
      (project.sourceType ?? "model") as HfType,
      project.owner,
      project.repo,
    );
    return [`${base}/raw/main/${CLAIM_FILE_NAME}`];
  }

  const rows = await db
    .select({ branch: projectStats.defaultBranch })
    .from(projectStats)
    .where(eq(projectStats.projectId, project.id))
    .limit(1);
  // The cached default branch is right almost always; main/master cover a
  // project indexed before its first stats refresh.
  const branches = [rows[0]?.branch, "main", "master"].filter(
    (b, i, all): b is string => Boolean(b) && all.indexOf(b) === i,
  );
  const owner = encodeURIComponent(project.owner);
  const repo = encodeURIComponent(project.repo);
  return branches.map(
    (branch) =>
      `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${CLAIM_FILE_NAME}`,
  );
}

/** The README/model card, whatever it is called upstream. */
async function readmeText(project: Subject): Promise<Fetched> {
  if (project.source === "huggingface") {
    const base = hfRepoUrl(
      (project.sourceType ?? "model") as HfType,
      project.owner,
      project.repo,
    );
    return fetchText(`${base}/raw/main/README.md`);
  }
  // GitHub's readme endpoint resolves any filename and casing for us.
  const text = await fetchReadmeText(project.owner, project.repo);
  return text === null ? { error: "missing" } : { text: text.slice(0, MAX_BODY_BYTES) };
}

/**
 * Looks for the token in the repository's proof file, falling back to the
 * README so maintainers who would rather not add a file can paste one line
 * into the card they already maintain.
 */
export async function verifyClaimFile(
  project: Subject,
  token: string,
): Promise<FileVerification> {
  const needle = token.toLowerCase();
  let sawFile = false;
  let networkError = false;

  for (const url of await proofFileUrls(project)) {
    const result = await fetchText(url);
    if ("error" in result) {
      if (result.error === "network") networkError = true;
      continue;
    }
    sawFile = true;
    if (result.text.toLowerCase().includes(needle)) {
      return { verified: true, source: CLAIM_FILE_NAME };
    }
  }

  const readme = await readmeText(project);
  if ("error" in readme) {
    if (readme.error === "network") networkError = true;
  } else if (readme.text.toLowerCase().includes(needle)) {
    return { verified: true, source: "README" };
  }

  if (sawFile) return { verified: false, reason: "file-mismatch" };
  if (networkError) return { verified: false, reason: "fetch-error" };
  return { verified: false, reason: "file-not-found" };
}
