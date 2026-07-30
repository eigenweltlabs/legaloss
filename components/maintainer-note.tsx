import { noteToHtml } from "@/lib/note";
import { sanitizeNote } from "@/lib/note-sanitize";

/**
 * The claimant-authored intro card above the README. Rich notes are stored as
 * sanitized HTML; legacy plain-text notes (with their hand-written lists) are
 * converted on the way out. Everything passes through the sanitizer again at
 * render, so a pre-editor note can never smuggle markup.
 */
export function MaintainerNote({ note }: { note: string }) {
  const html = sanitizeNote(noteToHtml(note));
  if (!html) return null;
  return (
    <div className="card maintainer-note">
      <span className="eyebrow">From the maintainer</span>
      <div className="note-prose" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}
