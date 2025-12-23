import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

type Props = {
  content: any;
  className?: string;
};

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] };

export function TiptapViewer({ content, className }: Props) {
  const editor = useEditor({
    immediatelyRender: false, // ✅ tránh SSR hydration mismatch nếu có SSR
    extensions: [
      StarterKit,
      Image.configure({
        inline: false,
        allowBase64: true, // nếu ảnh là base64 thì để true, chỉ url thì false cũng được
      }),
    ],
    editable: false,
    content: content ?? EMPTY_DOC,
  });

  useEffect(() => {
    if (!editor) return;
    editor.commands.setContent(content ?? EMPTY_DOC, { emitUpdate: false });
  }, [editor, content]);

  if (!editor) return null;

  return (
    <div className={className}>
      <EditorContent editor={editor} />
    </div>
  );
}
