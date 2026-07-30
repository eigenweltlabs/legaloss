import sanitizeHtml from "sanitize-html";

/**
 * Server-side allowlist for the maintainer note. Much tighter than the README
 * one: a note is a short intro, so no headings, images or block embeds —
 * paragraphs, lists, links and inline emphasis only.
 *
 * Server-side only (actions and server components) — keep it out of client
 * bundles.
 */
const NOTE_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "s", "code", "a", "ul", "ol", "li"],
  allowedAttributes: { a: ["href", "rel", "target"], ol: ["start"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noreferrer", target: "_blank" }),
  },
};

/** Returns clean HTML, or null for an effectively empty note. */
export function sanitizeNote(html: string): string | null {
  const clean = sanitizeHtml(html, NOTE_SANITIZE).trim();
  const isEmpty =
    sanitizeHtml(clean, { allowedTags: [], allowedAttributes: {} }).trim() === "";
  return isEmpty ? null : clean;
}
