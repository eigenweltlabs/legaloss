import "server-only";

const HF = "https://huggingface.co";
const HF_API = "https://huggingface.co/api";

export type HfType = "model" | "dataset" | "space";

export const HF_TYPES: HfType[] = ["model", "dataset", "space"];

/** API path segment and public URL prefix per repo type. */
const TYPE_META: Record<HfType, { api: string; urlPrefix: string; label: string }> = {
  model: { api: "models", urlPrefix: "", label: "Model" },
  dataset: { api: "datasets", urlPrefix: "datasets/", label: "Dataset" },
  space: { api: "spaces", urlPrefix: "spaces/", label: "Space" },
};

export function hfTypeLabel(type: string | null | undefined): string {
  return type && type in TYPE_META ? TYPE_META[type as HfType].label : "Repo";
}

/** Public huggingface.co URL for a repo. */
export function hfRepoUrl(type: HfType, owner: string, repo: string): string {
  return `${HF}/${TYPE_META[type].urlPrefix}${owner}/${repo}`;
}

/** lower(hf:type:owner/name) — the projects.fullNameKey for Hugging Face rows. */
export function hfKey(type: HfType, owner: string, repo: string): string {
  return `hf:${type}:${owner}/${repo}`.toLowerCase();
}

export type HfRepoData = {
  type: HfType;
  owner: string;
  repo: string;
  /** owner/name */
  id: string;
  likes: number;
  downloads: number;
  description: string | null;
  pipelineTag: string | null;
  libraryName: string | null;
  licenseId: string | null;
  tags: string[];
  lastModified: Date | null;
  isPrivate: boolean;
  isGated: boolean;
};

export type HfError = { status: number; message: string };

/**
 * Accepts huggingface.co URLs for models, datasets, and spaces:
 *   huggingface.co/owner/name            → model
 *   huggingface.co/datasets/owner/name   → dataset
 *   huggingface.co/spaces/owner/name     → space
 * Also accepts the "hf.co" shorthand host. Bare "owner/name" is intentionally
 * NOT matched here so it stays a GitHub shorthand.
 */
export function parseHuggingFaceUrl(
  input: string,
): { type: HfType; owner: string; repo: string } | null {
  const trimmed = input.trim();
  const m = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?(?:huggingface\.co|hf\.co)\/(.+?)\/?(?:[#?].*)?$/i,
  );
  if (!m) return null;

  const parts = m[1].split("/").filter(Boolean);
  let type: HfType = "model";
  let rest = parts;
  if (parts[0] === "datasets") {
    type = "dataset";
    rest = parts.slice(1);
  } else if (parts[0] === "spaces") {
    type = "space";
    rest = parts.slice(1);
  } else if (parts[0] === "models") {
    rest = parts.slice(1);
  }
  // Require exactly owner/name; skip single-segment canonical ids and deep paths.
  if (rest.length !== 2) return null;
  const [owner, repo] = rest;
  const ok = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
  if (!ok.test(owner) || !ok.test(repo)) return null;
  return { type, owner, repo };
}

function pickLicense(cardData: unknown, tags: string[]): string | null {
  const license = (cardData as { license?: unknown } | null)?.license;
  if (typeof license === "string" && license) return license;
  if (Array.isArray(license) && typeof license[0] === "string") return license[0];
  const tag = tags.find((t) => t.startsWith("license:"));
  return tag ? tag.slice("license:".length) : null;
}

/** Human-facing tags: drop HF's namespaced metadata (region:, license:, arxiv:…). */
function cleanTags(tags: string[]): string[] {
  return tags.filter((t) => !t.includes(":") && t !== "endpoints_compatible");
}

export async function fetchHfRepo(
  type: HfType,
  owner: string,
  repo: string,
): Promise<{ data: HfRepoData; error?: never } | { data?: never; error: HfError }> {
  const res = await fetch(
    `${HF_API}/${TYPE_META[type].api}/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { headers: { "User-Agent": "legaloss" }, cache: "no-store" },
  );
  if (!res.ok) {
    const message =
      res.status === 404
        ? "Repository not found on Hugging Face."
        : res.status === 429
          ? "Hugging Face rate limit reached. Try again shortly."
          : `Hugging Face responded with ${res.status}.`;
    return { error: { status: res.status, message } };
  }
  const j = await res.json();
  const tags: string[] = Array.isArray(j.tags) ? j.tags : [];
  const id: string = j.id ?? `${owner}/${repo}`;
  const [canonOwner, canonRepo] = id.includes("/") ? id.split("/") : [owner, repo];
  return {
    data: {
      type,
      owner: canonOwner,
      repo: canonRepo,
      id,
      likes: Number(j.likes ?? 0),
      downloads: Number(j.downloads ?? j.downloadsAllTime ?? 0),
      description:
        (typeof j.description === "string" && j.description) ||
        (j.cardData?.short_description ?? null),
      pipelineTag: j.pipeline_tag ?? null,
      libraryName: j.library_name ?? null,
      licenseId: pickLicense(j.cardData, tags),
      tags: cleanTags(tags).slice(0, 12),
      lastModified: j.lastModified ? new Date(j.lastModified) : null,
      isPrivate: Boolean(j.private),
      isGated: Boolean(j.gated),
    },
  };
}

/**
 * The model/dataset/space card (README.md), rendered to sanitized HTML by
 * GitHub's markdown endpoint, with the YAML frontmatter stripped and relative
 * asset URLs rewritten to Hugging Face's resolve/blob URLs.
 */
export async function fetchHfReadmeHtml(
  type: HfType,
  owner: string,
  repo: string,
): Promise<string | null> {
  const rawRes = await fetch(
    `${HF}/${TYPE_META[type].urlPrefix}${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/raw/main/README.md`,
    { headers: { "User-Agent": "legaloss" }, cache: "no-store" },
  );
  if (!rawRes.ok) return null;
  let md = await rawRes.text();
  md = stripFrontmatter(md);
  if (!md.trim()) return null;

  const ghHeaders: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "legaloss",
    "Content-Type": "application/json",
  };
  if (process.env.GITHUB_TOKEN) {
    ghHeaders.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const renderRes = await fetch("https://api.github.com/markdown", {
    method: "POST",
    headers: ghHeaders,
    cache: "no-store",
    body: JSON.stringify({ text: md, mode: "markdown" }),
  });
  if (!renderRes.ok) return null;
  const html = await renderRes.text();
  return rewriteRelativeUrls(html, type, owner, repo);
}

/** Remove a leading YAML frontmatter block (--- … ---) from a model card. */
function stripFrontmatter(md: string): string {
  if (!md.startsWith("---")) return md;
  const end = md.indexOf("\n---", 3);
  if (end === -1) return md;
  const after = md.indexOf("\n", end + 1);
  return after === -1 ? "" : md.slice(after + 1);
}

function rewriteRelativeUrls(
  html: string,
  type: HfType,
  owner: string,
  repo: string,
): string {
  const base = `${HF}/${TYPE_META[type].urlPrefix}${owner}/${repo}`;
  const rawBase = `${base}/resolve/main/`;
  const blobBase = `${base}/blob/main/`;
  return html
    .replace(/(<img[^>]+src=")(?!https?:|data:|\/\/)([^"]+)"/gi, (_m, pre, url) => {
      return `${pre}${rawBase}${url.replace(/^\.?\//, "")}"`;
    })
    .replace(/(<a[^>]+href=")(?!https?:|#|mailto:|\/\/)([^"]+)"/gi, (_m, pre, url) => {
      return `${pre}${blobBase}${url.replace(/^\.?\//, "")}"`;
    });
}
