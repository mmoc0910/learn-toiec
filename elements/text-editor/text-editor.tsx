import React, { useEffect, useMemo } from "react";
import { useController, type UseControllerProps } from "react-hook-form";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import type { JSONContent } from "@tiptap/core";
import { cn } from "utils/helpers/class-name";

type Props = {
  label?: string;
  placeholder?: string;
  containerClassName?: string;
  editorWrapClassName?: string;
  editorClassName?: string;
  toolbarClassName?: string;
  disabled?: boolean;
  minHeightClassName?: string; // vd: "min-h-[160px]"
} & UseControllerProps;

export function TextEditor({
  label,
  placeholder = "Nhập nội dung...",
  containerClassName,
  editorWrapClassName,
  editorClassName,
  toolbarClassName,
  disabled,
  minHeightClassName = "min-h-[160px]",
  ...props
}: Props) {
  const {
    field,
    fieldState: { error },
  } = useController(props);

  const isClient = typeof window !== "undefined";

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Image.configure({
        inline: false,
        allowBase64: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    [placeholder]
  );

  const editor = useEditor(
    {
      immediatelyRender: false, // ✅ SSR fix
      editable: !disabled,
      extensions,
      content: (field.value as JSONContent) || { type: "doc", content: [] },
      onUpdate: ({ editor }) => {
        field.onChange(editor.getJSON()); // ✅ lưu JSONContent
      },
      editorProps: {
        attributes: {
          class: cn(
            "outline-none px-4 py-2",
            minHeightClassName,
            "ProseMirror",
            editorClassName
          ),
        },
      },
    },
    [isClient]
  );

  // Sync khi reset/setValue từ ngoài
  useEffect(() => {
    if (!editor) return;

    const next = (field.value as JSONContent) || { type: "doc", content: [] };
    const current = editor.getJSON();

    const same = JSON.stringify(current) === JSON.stringify(next);
    if (!same) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [field.value, editor]);

  const renderLabel = () => {
    if (!label) return null;
    return (
      <label htmlFor={props.name} className="block text-sm font-medium">
        {label}
        {props.rules?.required && (
          <span className="text-red-700 font-bold text-xl">*</span>
        )}
      </label>
    );
  };

  const renderError = () => {
    if (!error) return null;
    return <p className="text-red-700 text-xs">{error?.message}</p>;
  };

  const Button = ({
    active,
    onClick,
    children,
    disabled: btnDisabled,
  }: {
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={btnDisabled}
      className={cn(
        "px-2 py-1 rounded-lg text-sm border border-[#e0e0e0] bg-white",
        "hover:bg-slate-50",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        active && "bg-violet-50 border-violet-200"
      )}
    >
      {children}
    </button>
  );

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Nhập URL", prev || "https://");
    if (url === null) return;

    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  // ✅ Image chỉ nhập link (không upload)
  const setImageByUrl = () => {
    if (!editor) return;

    const url = window.prompt("Dán link ảnh (https://...)", "https://");
    if (url === null) return;

    const cleaned = url.trim();
    if (!cleaned) return;

    // optional: chặn link không phải http(s)
    if (!/^https?:\/\//i.test(cleaned)) {
      window.alert("Link ảnh phải bắt đầu bằng http:// hoặc https://");
      return;
    }

    editor.chain().focus().setImage({ src: cleaned }).run();
  };

  // SSR fallback
  if (!isClient) {
    return (
      <div className={cn("flex flex-col flex-1", containerClassName)}>
        {renderLabel()}
        <div
          className={cn(
            "border border-[#e0e0e0] rounded-xl bg-white overflow-hidden",
            error && "border-red-300"
          )}
        >
          <div className={cn("px-4 py-2", minHeightClassName)}>
            <p className="text-slate-600">{placeholder}</p>
          </div>
        </div>
        {renderError()}
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col flex-1", containerClassName)}>
      {renderLabel()}

      <div
        className={cn(
          "border border-[#e0e0e0] rounded-xl bg-white overflow-hidden",
          "focus-within:ring-4 focus-within:ring-violet-100",
          error && "border-red-300 focus-within:ring-red-100",
          disabled && "opacity-70",
          editorWrapClassName
        )}
      >
        {/* Toolbar */}
        <div
          className={cn(
            "flex flex-wrap gap-2 p-2 border-b border-[#e0e0e0] bg-white",
            toolbarClassName
          )}
        >
          {/* Headings */}
          <Button
            disabled={!editor || disabled}
            active={!!editor?.isActive("heading", { level: 1 })}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 1 }).run()
            }
          >
            H1
          </Button>
          <Button
            disabled={!editor || disabled}
            active={!!editor?.isActive("heading", { level: 2 })}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 2 }).run()
            }
          >
            H2
          </Button>
          <Button
            disabled={!editor || disabled}
            active={!!editor?.isActive("heading", { level: 3 })}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level: 3 }).run()
            }
          >
            H3
          </Button>

          <div className="w-px bg-[#e0e0e0] mx-1" />

          {/* Marks */}
          <Button
            disabled={!editor || disabled}
            active={!!editor?.isActive("bold")}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            B
          </Button>
          <Button
            disabled={!editor || disabled}
            active={!!editor?.isActive("italic")}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            I
          </Button>
          <Button
            disabled={!editor || disabled}
            active={!!editor?.isActive("strike")}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            S
          </Button>

          <div className="w-px bg-[#e0e0e0] mx-1" />

          {/* Lists */}
          <Button
            disabled={!editor || disabled}
            active={!!editor?.isActive("bulletList")}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            • List
          </Button>
          <Button
            disabled={!editor || disabled}
            active={!!editor?.isActive("orderedList")}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            1. List
          </Button>

          <div className="w-px bg-[#e0e0e0] mx-1" />

          {/* Code block */}
          <Button
            disabled={!editor || disabled}
            active={!!editor?.isActive("codeBlock")}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          >
            {"</>"}
          </Button>

          <div className="w-px bg-[#e0e0e0] mx-1" />

          {/* Link */}
          <Button
            disabled={!editor || disabled}
            active={!!editor?.isActive("link")}
            onClick={setLink}
          >
            Link
          </Button>
          <Button
            disabled={!editor || disabled}
            onClick={() => editor?.chain().focus().unsetLink().run()}
          >
            Unlink
          </Button>

          <div className="w-px bg-[#e0e0e0] mx-1" />

          {/* Image by URL */}
          <Button
            disabled={!editor || disabled}
            onClick={setImageByUrl}
          >
            Image
          </Button>

          <div className="flex-1" />

          <Button
            disabled={!editor || disabled}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            Undo
          </Button>
          <Button
            disabled={!editor || disabled}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            Redo
          </Button>
        </div>

        {/* Editor */}
        <EditorContent editor={editor} />
      </div>

      {renderError()}

      <style>{`
        .ProseMirror {
          white-space: pre-wrap;
          word-break: break-word;
        }
        .ProseMirror:focus { outline: none; }
        .ProseMirror p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #64748b;
          pointer-events: none;
          height: 0;
        }
        .ProseMirror > * + * { margin-top: 0.75rem; }
        .ProseMirror ul, .ProseMirror ol { padding-left: 1.25rem; }
        .ProseMirror pre {
          background: #0b1220;
          color: #e5e7eb;
          padding: 0.75rem;
          border-radius: 0.75rem;
          overflow-x: auto;
        }
        .ProseMirror code {
          background: #f1f5f9;
          padding: 0.1rem 0.3rem;
          border-radius: 0.4rem;
        }
        .ProseMirror img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
        }
      `}</style>
    </div>
  );
}
