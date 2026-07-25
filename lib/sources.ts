/**
 * Client-safe source helpers (no server-only imports). URL building and labels
 * shared by cards, the featured strip, detail pages, and the sitemap.
 */

export type Source = "github" | "huggingface";

type SourceShape = {
  source: string;
  sourceType: string | null;
  owner: string;
  repo: string;
};

const HF_PREFIX: Record<string, string> = {
  model: "",
  dataset: "datasets/",
  space: "spaces/",
};

/** Internal detail-page path for a project, routed by source. */
export function projectHref(p: SourceShape): string {
  if (p.source === "huggingface") {
    return `/hf/${p.sourceType ?? "model"}/${p.owner}/${p.repo}`;
  }
  return `/projects/${p.owner}/${p.repo}`;
}

/** The upstream public URL (github.com / huggingface.co). */
export function sourceExternalUrl(p: SourceShape): string {
  if (p.source === "huggingface") {
    const prefix = HF_PREFIX[p.sourceType ?? "model"] ?? "";
    return `https://huggingface.co/${prefix}${p.owner}/${p.repo}`;
  }
  return `https://github.com/${p.owner}/${p.repo}`;
}

export function sourceLabel(source: string): string {
  return source === "huggingface" ? "Hugging Face" : "GitHub";
}

export function isHuggingFace(source: string): boolean {
  return source === "huggingface";
}
