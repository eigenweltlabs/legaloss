"use client";

import { useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

function ToolButton({
  label,
  title,
  active,
  disabled,
  onClick,
}: {
  label: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={active ? "is-active" : undefined}
      disabled={disabled}
      // Keep focus (and the selection) inside the editor while clicking.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/**
 * Compact rich-text field for the maintainer note — the README editor's small
 * sibling. No headings, images or block embeds; the server-side note
 * sanitizer strips anything beyond paragraphs, lists, links and emphasis.
 */
export function NoteEditor({
  id,
  initialHtml,
  onChange,
}: {
  id?: string;
  initialHtml: string;
  onChange: (html: string) => void;
}) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false },
      }),
    ],
    content: initialHtml,
    // Required for Next.js SSR: render only after hydration.
    immediatelyRender: false,
    editorProps: { attributes: { class: "note-prose", ...(id ? { id } : {}) } },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  const state = useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor;
      if (!e) return null;
      return {
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        code: e.isActive("code"),
        bulletList: e.isActive("bulletList"),
        orderedList: e.isActive("orderedList"),
        link: e.isActive("link"),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      };
    },
  });

  function openLinkRow() {
    if (!editor) return;
    const existing = editor.getAttributes("link").href as string | undefined;
    setLinkUrl(existing ?? "");
    setLinkOpen(true);
  }

  function applyLink() {
    if (!editor) return;
    const url = linkUrl.trim();
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      const href = /^(https?:\/\/|mailto:)/i.test(url) ? url : `https://${url}`;
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
  }

  const busy = !editor;

  return (
    <div className="readme-editor">
      <div className="readme-editor-toolbar">
        <ToolButton
          label="B"
          title="Bold"
          active={state?.bold}
          disabled={busy}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolButton
          label="I"
          title="Italic"
          active={state?.italic}
          disabled={busy}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolButton
          label="code"
          title="Inline code"
          active={state?.code}
          disabled={busy}
          onClick={() => editor?.chain().focus().toggleCode().run()}
        />
        <span className="readme-editor-sep" aria-hidden />
        <ToolButton
          label="• list"
          title="Bullet list"
          active={state?.bulletList}
          disabled={busy}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolButton
          label="1. list"
          title="Ordered list"
          active={state?.orderedList}
          disabled={busy}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <span className="readme-editor-sep" aria-hidden />
        <ToolButton
          label="link"
          title="Add or edit link"
          active={state?.link || linkOpen}
          disabled={busy}
          onClick={() => (linkOpen ? setLinkOpen(false) : openLinkRow())}
        />
        <span className="readme-editor-sep" aria-hidden />
        <ToolButton
          label="undo"
          title="Undo"
          disabled={busy || !state?.canUndo}
          onClick={() => editor?.chain().focus().undo().run()}
        />
        <ToolButton
          label="redo"
          title="Redo"
          disabled={busy || !state?.canRedo}
          onClick={() => editor?.chain().focus().redo().run()}
        />
      </div>

      {linkOpen && (
        <div className="readme-editor-linkrow">
          <input
            type="text"
            autoFocus
            placeholder="https://… (leave empty to remove the link)"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
              if (e.key === "Escape") setLinkOpen(false);
            }}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={applyLink}>
            Apply
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setLinkOpen(false)}
          >
            Cancel
          </button>
        </div>
      )}

      <EditorContent editor={editor} className="note-editor-surface" />
    </div>
  );
}
