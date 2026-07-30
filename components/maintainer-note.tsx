type Block =
  | { kind: "p"; text: string }
  | { kind: "ol"; start: number; items: string[] }
  | { kind: "ul"; items: string[] };

/**
 * Maintainer notes are plain text, but maintainers write lists in them
 * ("1. Work type", "- documents"), so lines that look like list items get
 * rendered as real lists instead of a pre-line text dump.
 */
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

export function MaintainerNote({ note }: { note: string }) {
  return (
    <div className="card maintainer-note">
      <span className="eyebrow">From the maintainer</span>
      {parseNote(note).map((block, i) => {
        if (block.kind === "p") return <p key={i}>{block.text}</p>;
        const List = block.kind === "ol" ? "ol" : "ul";
        return (
          <List key={i} className="note-list" start={block.kind === "ol" ? block.start : undefined}>
            {block.items.map((item, j) => (
              <li key={j}>
                <span className="note-marker numeral" aria-hidden>
                  {block.kind === "ol" ? String(block.start + j).padStart(2, "0") : "—"}
                </span>
                {item}
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
