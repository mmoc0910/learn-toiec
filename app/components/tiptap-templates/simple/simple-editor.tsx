"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, EditorContext, useEditor } from "@tiptap/react";

// ✅ RHF
import { useController, type UseControllerProps } from "react-hook-form";
import type { JSONContent } from "@tiptap/core";

// --- Tiptap Core Extensions ---
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import Highlight from "@tiptap/extension-highlight";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";



// --- UI Primitives ---
import { Button } from "~/components/tiptap-ui-primitive/button";
import { Spacer } from "~/components/tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "~/components/tiptap-ui-primitive/toolbar";

// --- Tiptap Node ---
import { HorizontalRule } from "~/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import "~/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "~/components/tiptap-node/code-block-node/code-block-node.scss";
import "~/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "~/components/tiptap-node/list-node/list-node.scss";
import "~/components/tiptap-node/image-node/image-node.scss";
import "~/components/tiptap-node/heading-node/heading-node.scss";
import "~/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "~/components/tiptap-ui/heading-dropdown-menu";
import { ListDropdownMenu } from "~/components/tiptap-ui/list-dropdown-menu";
import { BlockquoteButton } from "~/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "~/components/tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "~/components/tiptap-ui/color-highlight-popover";
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "~/components/tiptap-ui/link-popover";
import { MarkButton } from "~/components/tiptap-ui/mark-button";
import { TextAlignButton } from "~/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "~/components/tiptap-ui/undo-redo-button";

// --- Icons ---
import { ArrowLeftIcon } from "~/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "~/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "~/components/tiptap-icons/link-icon";

// --- Hooks ---
import { useIsBreakpoint } from "~/hooks/use-is-breakpoint";
import { useWindowSize } from "~/hooks/use-window-size";
import { useCursorVisibility } from "~/hooks/use-cursor-visibility";

// --- Components ---
import { ThemeToggle } from "~/components/tiptap-templates/simple/theme-toggle";

// --- Styles ---
import "~/components/tiptap-templates/simple/simple-editor.scss";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Selection } from "@tiptap/extensions";

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  onImageClick, // ✅ NEW
  isMobile,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  onImageClick: () => void; // ✅ NEW
  isMobile: boolean;
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
          portal={isMobile}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      {/* ✅ Thay ImageUploadButton bằng nút mở prompt */}
      <ToolbarGroup>
        <Button data-style="secondary" onClick={onImageClick}>
          Add image
        </Button>
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      <ToolbarGroup>
        <ThemeToggle />
      </ToolbarGroup>
    </>
  );
};

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
);

// ✅ RHF: props
type SimpleEditorProps = {
  label?: string;
  containerClassName?: string;
} & UseControllerProps;

export function SimpleEditor({ label, containerClassName, ...props }: SimpleEditorProps) {
  const isMobile = useIsBreakpoint();
  const { height } = useWindowSize();
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  );
  const toolbarRef = useRef<HTMLDivElement>(null);

  // ✅ RHF
  const {
    field,
    fieldState: { error },
  } = useController(props);

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image.configure({
        allowBase64: false, // ✅ chỉ dùng URL, không dùng base64
      }),
      Typography,
      Superscript,
      Subscript,
      Selection,
      // ❌ BỎ ImageUploadNode hoàn toàn (không upload)
    ],

    content: (field.value as JSONContent) || { type: "doc", content: [] },

    onUpdate: ({ editor }) => {
      field.onChange(editor.getJSON());
    },

    onBlur: () => field.onBlur(),
  });

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  });

  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main");
    }
  }, [isMobile, mobileView]);

  useEffect(() => {
    if (!editor) return;
    const next = (field.value as JSONContent) || { type: "doc", content: [] };
    const same = JSON.stringify(editor.getJSON()) === JSON.stringify(next);
    if (!same) {
      editor.commands.setContent(next, { emitUpdate: false });
    }
  }, [field.value, editor]);

  // ✅ Prompt nhập link ảnh rồi insert
  const onAddImageByLink = () => {
    if (!editor) return;
    const url = window.prompt("Nhập link ảnh (URL):");
    const src = (url || "").trim();
    if (!src) return;

    editor.chain().focus().setImage({ src }).run();
  };

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

  return (
    <div className={containerClassName}>
      {renderLabel()}

      <div className="simple-editor-wrapper bg-white rounded-xl !w-full !h-auto !border !border-[#e0e0e0]">
        <EditorContext.Provider value={{ editor }}>
          <Toolbar
            ref={toolbarRef}
            style={{
              ...(isMobile
                ? {
                    bottom: `calc(100% - ${height - rect.y}px)`,
                  }
                : {}),
            }}
            className="!border-b !border-b-[#e0e0e0]"
          >
            {mobileView === "main" ? (
              <MainToolbarContent
                onHighlighterClick={() => setMobileView("highlighter")}
                onLinkClick={() => setMobileView("link")}
                onImageClick={onAddImageByLink} // ✅ NEW
                isMobile={isMobile}
              />
            ) : (
              <MobileToolbarContent
                type={mobileView === "highlighter" ? "highlighter" : "link"}
                onBack={() => setMobileView("main")}
              />
            )}
          </Toolbar>

          <EditorContent
            editor={editor}
            role="presentation"
            className="simple-editor-content"
          />
        </EditorContext.Provider>
      </div>

      {renderError()}
    </div>
  );
}
