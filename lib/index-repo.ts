import "server-only";
import { fetchRepo, parseGitHubUrl } from "@/lib/github";
import {
  fetchHfRepo,
  hfKey,
  parseHuggingFaceUrl,
  type HfType,
} from "@/lib/huggingface";
import type { projectStats } from "@/lib/db/schema";

export type Detected =
  | { source: "github"; owner: string; repo: string }
  | { source: "huggingface"; type: HfType; owner: string; repo: string };

/** GitHub is the fallback so bare "owner/repo" stays a GitHub shorthand. */
export function detectSource(input: string): Detected | null {
  const hf = parseHuggingFaceUrl(input);
  if (hf) return { source: "huggingface", ...hf };
  const gh = parseGitHubUrl(input);
  if (gh) return { source: "github", ...gh };
  return null;
}

/** Everything the projects + projectStats inserts need, normalized per source. */
export type ResolvedRepo = {
  source: "github" | "huggingface";
  sourceType: string | null;
  owner: string;
  repo: string;
  fullName: string;
  key: string;
  topics: string[];
  description: string | null;
  stats: Omit<typeof projectStats.$inferInsert, "projectId" | "fetchedAt">;
};

/** Fetch canonical data server-side and normalize it; never trust the client. */
export async function resolveRepo(
  detected: Detected,
): Promise<{ data: ResolvedRepo } | { error: string }> {
  if (detected.source === "huggingface") {
    const result = await fetchHfRepo(detected.type, detected.owner, detected.repo);
    if (result.error) return { error: result.error.message };
    const d = result.data;
    if (d.isPrivate) return { error: "Only public repositories can be indexed." };
    return {
      data: {
        source: "huggingface",
        sourceType: d.type,
        owner: d.owner,
        repo: d.repo,
        fullName: d.id,
        key: hfKey(d.type, d.owner, d.repo),
        topics: d.tags,
        description: d.description,
        stats: {
          stars: d.likes,
          forks: 0,
          openIssues: 0,
          subscribers: 0,
          downloads: d.downloads,
          language: d.pipelineTag ?? d.libraryName,
          licenseSpdx: d.licenseId,
          licenseName: d.licenseId,
          topics: d.tags,
          description: d.description,
          homepage: null,
          defaultBranch: "main",
          pushedAt: d.lastModified,
          archived: false,
        },
      },
    };
  }

  const result = await fetchRepo(detected.owner, detected.repo);
  if (result.error) return { error: result.error.message };
  const d = result.data;
  if (d.isPrivate) return { error: "Only public repositories can be indexed." };
  return {
    data: {
      source: "github",
      sourceType: null,
      owner: d.owner,
      repo: d.repo,
      fullName: d.fullName,
      key: d.fullName.toLowerCase(),
      topics: d.topics,
      description: d.description,
      stats: {
        stars: d.stars,
        forks: d.forks,
        openIssues: d.openIssues,
        subscribers: d.subscribers,
        downloads: 0,
        language: d.language,
        licenseSpdx: d.licenseSpdx,
        licenseName: d.licenseName,
        topics: d.topics,
        description: d.description,
        homepage: d.homepage,
        defaultBranch: d.defaultBranch,
        pushedAt: d.pushedAt,
        archived: d.archived,
      },
    },
  };
}
