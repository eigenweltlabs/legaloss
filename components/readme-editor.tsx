"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { resetProjectReadme, updateProjectReadme } from "@/app/actions";

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

export function ReadmeEditor({
  projectId,
  initialHtml,
  hasOverride,
}: {
  projectId: number;
  initialHtml: string;
  hasOverride: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [overridden, setOverridden] = useState(hasOverride);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [saving, startSave] = useTransition();
  const [resetPending, startReset] = useTransition();

  const editor = useEditor({
    extensions: [
      // StarterKit v3 bundles Link; keep clicks from navigating while editing.
      StarterKit.configure({ link: { openOnClick: false } }),
      Image,
    ],
    content: initialHtml,
    // Required for Next.js SSR: render only after hydration.
    immediatelyRender: false,
    onUpdate: () => setSaved(false),
  });

  const state = useEditorState({
    editor,
    selector: (ctx) => {
      const e = ctx.editor;
      if (!e) return null;
      return {
        h2: e.isActive("heading", { level: 2 }),
        h3: e.isActive("heading", { level: 3 }),
        bold: e.isActive("bold"),
        italic: e.isActive("italic"),
        code: e.isActive("code"),
        codeBlock: e.isActive("codeBlock"),
        bulletList: e.isActive("bulletList"),
        orderedList: e.isActive("orderedList"),
        blockquote: e.isActive("blockquote"),
        link: e.isActive("link"),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
      };
    },
  });

  // After a reset, router.refresh() delivers the GitHub README as the new
  // initialHtml; swap the editing surface over to it exactly once.
  const lastInitial = useRef(initialHtml);
  const syncOnNextChange = useRef(false);
  useEffect(() => {
    if (!editor || initialHtml === lastInitial.current) return;
    lastInitial.current = initialHtml;
    if (syncOnNextChange.current) {
      syncOnNextChange.current = false;
      editor.commands.setContent(initialHtml);
    }
  }, [editor, initialHtml]);

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

  function save() {
    if (!editor) return;
    setError(null);
    setSaved(false);
    syncOnNextChange.current = false;
    startSave(async () => {
      const result = await updateProjectReadme({ projectId, html: editor.getHTML() });
      if (result.ok) {
        setSaved(true);
        setOverridden(!result.cleared);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  function reset() {
    setError(null);
    startReset(async () => {
      const result = await resetProjectReadme(projectId);
      if (result.ok) {
        setConfirmingReset(false);
        setOverridden(false);
        setSaved(false);
        syncOnNextChange.current = true;
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  const busy = !editor;

  return (
    <div>
      <div className="readme-editor">
        <div className="readme-editor-toolbar">
          <ToolButton
            label="H2"
            title="Heading 2"
            active={state?.h2}
            disabled={busy}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          />
          <ToolButton
            label="H3"
            title="Heading 3"
            active={state?.h3}
            disabled={busy}
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          />
          <span className="readme-editor-sep" aria-hidden />
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
          <ToolButton
            label="```"
            title="Code block"
            active={state?.codeBlock}
            disabled={busy}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
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
          <ToolButton
            label="quote"
            title="Blockquote"
            active={state?.blockquote}
            disabled={busy}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          />
          <span className="readme-editor-sep" aria-hidden />
          <ToolButton
            label="link"
            title="Add or edit link"
            active={state?.link || linkOpen}
            disabled={busy}
            onClick={() => (linkOpen ? setLinkOpen(false) : openLinkRow())}
          />
          <ToolButton
            label="―"
            title="Horizontal rule"
            disabled={busy}
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
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

        <EditorContent editor={editor} className="readme readme-editor-surface" />
      </div>

      <div className="row-between" style={{ marginTop: 14 }}>
        {overridden ? (
          !confirmingReset ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setConfirmingReset(true)}
            >
              Reset to GitHub README
            </button>
          ) : (
            <span className="cluster">
              <span className="body-s">Discard your custom README?</span>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                disabled={resetPending}
                onClick={reset}
              >
                {resetPending ? "Resetting…" : "Yes, reset"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setConfirmingReset(false)}
              >
                Keep it
              </button>
            </span>
          )
        ) : (
          <span />
        )}
        <span className="cluster">
          {error && <span className="form-error" style={{ marginTop: 0 }}>{error}</span>}
          {saved && !error && (
            <span className="form-hint" style={{ marginTop: 0 }}>
              Saved.
            </span>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={save}
            disabled={saving || !editor}
          >
            {saving ? "Saving…" : "Save README"}
          </button>
        </span>
      </div>
    </div>
  );
}
