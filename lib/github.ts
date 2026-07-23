import "server-only";

const API = "https://api.github.com";
const API_VERSION = "2022-11-28";

export type RepoData = {
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

export type GitHubError = {
  status: number;
  message: string;
};

function headers(token?: string): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VERSION,
    "User-Agent": "legaloss",
  };
  const auth = token ?? process.env.GITHUB_TOKEN;
  if (auth) h.Authorization = `Bearer ${auth}`;
  return h;
}

/**
 * Accepts "https://github.com/owner/repo", with optional .git / trailing
 * path segments, or the bare "owner/repo" shorthand.
 */
export function parseGitHubUrl(
  input: string,
): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  let path: string | null = null;

  const urlMatch = trimmed.match(
    /^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+\/[^/\s]+)(?:[/#?].*)?$/i,
  );
  if (urlMatch) path = urlMatch[1];
  else if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(trimmed)) path = trimmed;

  if (!path) return null;
  const [owner, repoRaw] = path.split("/");
  const repo = repoRaw.replace(/\.git$/i, "");
  if (!/^[A-Za-z0-9-]+$/.test(owner.replace(/[_.]/g, "-"))) return null;
  if (!repo) return null;
  return { owner, repo };
}

export async function fetchRepo(
  owner: string,
  repo: string,
  token?: string,
): Promise<{ data: RepoData; error?: never } | { data?: never; error: GitHubError }> {
  const res = await fetch(
    `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    { headers: headers(token), cache: "no-store" },
  );
  if (!res.ok) {
    const message =
      res.status === 404
        ? "Repository not found on GitHub."
        : res.status === 403 || res.status === 429
          ? "GitHub rate limit reached. Try again shortly."
          : `GitHub responded with ${res.status}.`;
    return { error: { status: res.status, message } };
  }
  const j = await res.json();
  return {
    data: {
      owner: j.owner.login,
      repo: j.name,
      fullName: j.full_name,
      description: j.description ?? null,
      homepage: j.homepage || null,
      stars: j.stargazers_count ?? 0,
      forks: j.forks_count ?? 0,
      openIssues: j.open_issues_count ?? 0,
      subscribers: j.subscribers_count ?? 0,
      language: j.language ?? null,
      licenseSpdx: j.license?.spdx_id && j.license.spdx_id !== "NOASSERTION" ? j.license.spdx_id : null,
      licenseName: j.license?.name ?? null,
      topics: Array.isArray(j.topics) ? j.topics : [],
      defaultBranch: j.default_branch ?? "main",
      pushedAt: j.pushed_at ? new Date(j.pushed_at) : null,
      archived: Boolean(j.archived),
      isPrivate: Boolean(j.private),
    },
  };
}

/**
 * README rendered to HTML by GitHub (GitHub sanitizes this HTML).
 * Relative image/link URLs are rewritten to absolute GitHub URLs.
 */
export async function fetchReadmeHtml(
  owner: string,
  repo: string,
  defaultBranch: string,
): Promise<string | null> {
  const res = await fetch(
    `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/readme`,
    {
      headers: { ...headers(), Accept: "application/vnd.github.html+json" },
      cache: "no-store",
    },
  );
  if (!res.ok) return null;
  const html = await res.text();
  return replaceVideos(
    rewriteRelativeUrls(html, owner, repo, defaultBranch),
    owner,
    repo,
  );
}

export type ContributorData = {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  contributions: number;
};

/** First page of contributors (up to 100), bots excluded. */
export async function fetchContributors(
  owner: string,
  repo: string,
): Promise<{ contributors: ContributorData[]; hasMore: boolean } | null> {
  const res = await fetch(
    `${API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contributors?per_page=100`,
    { headers: headers(), cache: "no-store" },
  );
  if (!res.ok) return null;
  const list = await res.json();
  if (!Array.isArray(list)) return null;
  const contributors = list
    .filter((c) => c.type === "User" && !String(c.login).endsWith("[bot]"))
    .map((c) => ({
      login: String(c.login),
      avatarUrl: String(c.avatar_url ?? ""),
      htmlUrl: String(c.html_url ?? `https://github.com/${c.login}`),
      contributions: Number(c.contributions ?? 0),
    }));
  // A rel="next" Link header means the list continues past this page.
  const hasMore = /rel="next"/.test(res.headers.get("link") ?? "");
  return { contributors, hasMore };
}

/**
 * GitHub embeds README videos with short-lived signed URLs that expire well
 * within our cache TTL, leaving a large dead player. Swap them for a link.
 */
function replaceVideos(html: string, owner: string, repo: string): string {
  const href = `https://github.com/${owner}/${repo}#readme`;
  return html.replace(
    /<video[\s\S]*?(?:<\/video>|\/>)/gi,
    `<p><a class="readme-video-link" href="${href}" target="_blank" rel="noreferrer">Watch the video on GitHub &rarr;</a></p>`,
  );
}

function rewriteRelativeUrls(
  html: string,
  owner: string,
  repo: string,
  branch: string,
): string {
  const rawBase = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
  const blobBase = `https://github.com/${owner}/${repo}/blob/${branch}/`;
  return html
    .replace(/(<img[^>]+src=")(?!https?:|data:|\/\/)([^"]+)"/gi, (_m, pre, url) => {
      return `${pre}${rawBase}${url.replace(/^\.?\//, "")}"`;
    })
    .replace(/(<a[^>]+href=")(?!https?:|#|mailto:|\/\/)([^"]+)"/gi, (_m, pre, url) => {
      return `${pre}${blobBase}${url.replace(/^\.?\//, "")}"`;
    });
}
