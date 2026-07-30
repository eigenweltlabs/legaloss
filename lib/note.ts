/**
 * Maintainer notes started life as plain text and are now authored as rich
 * HTML. These helpers are isomorphic (used by the server-rendered note and
 * the client-side editor) and convert legacy plain-text notes — including
 * their hand-written "1. Work type" / "- documents" lists — into the same
 * HTML shape the editor produces.
 */

type Block =
  | { kind: "p"; text: string }
  | { kind: "ol"; start: number; items: string[] }
  | { kind: "ul"; items: string[] };

function parseNote(note: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join(" ") });
    para = [];
  };
  for (const line of note.split("\n")) {
    const trimmed = line.trim();
    const ordered = trimmed.match(/^(\d+)[.)]\s+(.*)/);
    const unordered = trimmed.match(/^[-*•]\s+(.*)/);
    if (ordered) {
      flushPara();
      const last = blocks[blocks.length - 1];
      if (last?.kind === "ol") last.items.push(ordered[2]);
      else blocks.push({ kind: "ol", start: Number(ordered[1]), items: [ordered[2]] });
    } else if (unordered) {
      flushPara();
      const last = blocks[blocks.length - 1];
      if (last?.kind === "ul") last.items.push(unordered[1]);
      else blocks.push({ kind: "ul", items: [unordered[1]] });
    } else if (trimmed === "") {
      flushPara();
    } else {
      para.push(trimmed);
    }
  }
  flushPara();
  return blocks;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function isRichNote(note: string): boolean {
  return /^\s*</.test(note);
}

export function noteToHtml(note: string): string {
  if (note.trim() === "") return "";
  if (isRichNote(note)) return note;
  return parseNote(note)
    .map((block) => {
      if (block.kind === "p") return `<p>${escapeHtml(block.text)}</p>`;
      const items = block.items.map((item) => `<li><p>${escapeHtml(item)}</p></li>`).join("");
      if (block.kind === "ul") return `<ul>${items}</ul>`;
      return block.start === 1 ? `<ol>${items}</ol>` : `<ol start="${block.start}">${items}</ol>`;
    })
    .join("");
}
