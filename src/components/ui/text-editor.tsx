"use client";

import * as React from "react";
import {
  useEditor,
  mergeAttributes,
  EditorContent,
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type Editor,
  type NodeViewProps,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Superscript from "@tiptap/extension-superscript";
import SubScript from "@tiptap/extension-subscript";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import FileHandler from "@tiptap/extension-file-handler";
import {
  type ImageOptions,
  Image as TiptapImage,
} from "@tiptap/extension-image";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dropzone,
  DropzoneContent,
  DropzoneEmptyState,
} from "@/components/ui/dropzone";

import {
  Bold,
  Strikethrough,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Link as LinkIcon,
  Quote,
  List,
  ListOrdered,
  RemoveFormattingIcon,
  Unlink,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Code,
  Image as ImageIcon,
  Highlighter,
  Subscript,
  Superscript as SuperscriptIcon,
  Minus,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface TextEditorProps {
  value?: string;
  placeholder?: string;
  onChange?: (content: string) => void;
  disabled?: boolean;
  className?: string;
}

function TextEditor({
  value = "",
  onChange,
  placeholder = "",
  disabled = false,
  className,
}: TextEditorProps) {
  const [open, setOpen] = React.useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
      }),
      Underline,
      Highlight,
      Link,
      TextAlign.configure({
        types: ["heading", "paragraph"],
        alignments: ["left", "center", "right", "justify"],
      }),
      Superscript,
      SubScript,
      Image.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: "tiptap-image",
        },
      }),
      Placeholder.configure({ placeholder }),
      FileHandler.configure({
        allowedMimeTypes: [
          "image/png",
          "image/jpeg",
          "image/gif",
          "image/webp",
        ],
        onDrop: (currentEditor, files, pos) => {
          files.forEach((file) => {
            handleImageChange(file, currentEditor, pos);
          });
        },
        onPaste: (currentEditor, files, htmlContent) => {
          files.forEach((file) => {
            if (htmlContent) {
              // if there is htmlContent, stop manual insertion & let other extensions handle insertion via inputRule
              // you could extract the pasted file from this url string and upload it to a server for example
              return false;
            }

            handleImageChange(
              file,
              currentEditor,
              currentEditor.state.selection.anchor
            );
          });
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? "" : editor.getHTML();
      onChange?.(html);
    },
    editorProps: {
      attributes: {
        class: cn(
          "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 min-h-[60px] rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-base",
          "prose dark:prose-invert max-w-full"
        ),
      },
    },
  });

  React.useEffect(() => {
    if (editor) editor.setEditable(!disabled);
  }, [disabled, editor]);

  React.useEffect(() => {
    if (!editor) return;
    // hindari setContent kalau isinya sama (biar ga loop / reset caret)
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value, false); // false = jangan emit onUpdate
      // optional: reset history kalau mau benar2 "fresh"
      // editor.commands.clearHistory();
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Skeleton className="h-8 w-12 rounded" />
          <Skeleton className="h-8 w-12 rounded" />
          <Skeleton className="h-8 w-12 rounded" />
          <Skeleton className="h-8 w-12 rounded" />
          <Skeleton className="h-8 w-12 rounded" />
          <Skeleton className="h-8 w-12 rounded" />
        </div>

        <Skeleton className="h-24 w-full rounded-md" />
      </>
    );
  }

  function setAlign(align: "left" | "center" | "right" | "justify") {
    if (!editor) return;
    const isImageSelected = editor.isActive("image");
    if (isImageSelected) {
      editor
        .chain()
        .focus()
        .updateAttributes("image", {
          "data-align": align == "justify" ? "center" : align,
        })
        .run();
    } else {
      editor.chain().focus().setTextAlign(align).run();
    }
  }

  const handleImageChange = (
    file: File,
    currentEditor: Editor,
    pos: number
  ) => {
    const reader = new FileReader();

    reader.readAsDataURL(file);
    reader.onload = () => {
      currentEditor
        .chain()
        .focus()
        .insertContentAt(pos, {
          type: "image",
          attrs: {
            src: reader.result,
            alt: file.name,
          },
        })
        .run();
      setOpen(false);
    };
    reader.onerror = () => toast.error("Failed to read the image file.");
  };

  return (
    <div className={className}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ToggleGroup type="multiple" size="sm" variant="outline">
          <ToggleGroupItem
            value="bold"
            aria-label="Toggle bold"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run() || disabled}
            data-state={editor.isActive("bold") ? "on" : "off"}
          >
            <Bold className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="strike"
            aria-label="Toggle strikethrough"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run() || disabled}
            data-state={editor.isActive("strike") ? "on" : "off"}
          >
            <Strikethrough className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="italic"
            aria-label="Toggle italic"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run() || disabled}
            data-state={editor.isActive("italic") ? "on" : "off"}
          >
            <Italic className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="underline"
            aria-label="Toggle underline"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!editor.can().chain().focus().toggleUnderline().run() || disabled}
            data-state={editor.isActive("underline") ? "on" : "off"}
          >
            <UnderlineIcon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="code"
            aria-label="Toggle code"
            onClick={() => editor.chain().focus().toggleCode().run()}
            disabled={!editor.can().chain().focus().toggleCode().run() || disabled}
            data-state={editor.isActive("code") ? "on" : "off"}
          >
            <Code className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="highlight"
            aria-label="Toggle highlight"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            disabled={!editor.can().chain().focus().toggleHighlight().run() || disabled}
            data-state={editor.isActive("highlight") ? "on" : "off"}
          >
            <Highlighter className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="clear"
            aria-label="Clear formatting"
            onClick={() =>
              editor.chain().focus().clearNodes().unsetAllMarks().run()
            }
            disabled={
              !editor.can().chain().focus().clearNodes().unsetAllMarks().run() || disabled
            }
            data-state="off"
          >
            <RemoveFormattingIcon className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup type="single" size="sm" variant="outline">
          <ToggleGroupItem
            value="h1"
            aria-label="Heading 1"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            disabled={
              !editor.can().chain().focus().toggleHeading({ level: 1 }).run() || disabled
            }
            data-state={editor.isActive("heading", { level: 1 }) ? "on" : "off"}
          >
            <Heading1 className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="h2"
            aria-label="Heading 2"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            disabled={
              !editor.can().chain().focus().toggleHeading({ level: 2 }).run() || disabled
            }
            data-state={editor.isActive("heading", { level: 2 }) ? "on" : "off"}
          >
            <Heading2 className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="h3"
            aria-label="Heading 3"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            disabled={
              !editor.can().chain().focus().toggleHeading({ level: 3 }).run() || disabled
            }
            data-state={editor.isActive("heading", { level: 3 }) ? "on" : "off"}
          >
            <Heading3 className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="h4"
            aria-label="Heading 4"
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 4 }).run()
            }
            disabled={
              !editor.can().chain().focus().toggleHeading({ level: 4 }).run() || disabled
            }
            data-state={editor.isActive("heading", { level: 4 }) ? "on" : "off"}
          >
            <Heading4 className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="image"
            aria-label="Add image"
            onClick={() => setOpen(true)}
            disabled={
              !editor
                .can()
                .chain()
                .focus()
                .setImage({ src: "https://example.com" })
                .run() || disabled
            }
            data-state={editor.isActive("image") ? "on" : "off"}
          >
            <ImageIcon className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup type="multiple" size="sm" variant="outline">
          <ToggleGroupItem
            value="blockquote"
            aria-label="Toggle blockquote"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            disabled={!editor.can().chain().focus().toggleBlockquote().run() || disabled}
            data-state={editor.isActive("blockquote") ? "on" : "off"}
          >
            <Quote className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="bulletList"
            aria-label="Toggle bullet list"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={!editor.can().chain().focus().toggleBulletList().run() || disabled}
            data-state={editor.isActive("bulletList") ? "on" : "off"}
          >
            <List className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="orderedList"
            aria-label="Toggle ordered list"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={!editor.can().chain().focus().toggleOrderedList().run() || disabled}
            data-state={editor.isActive("orderedList") ? "on" : "off"}
          >
            <ListOrdered className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="horizontalRule"
            aria-label="Add horizontal rule"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            disabled={!editor.can().chain().focus().setHorizontalRule().run() || disabled}
            data-state="off"
          >
            <Minus className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="superscript"
            aria-label="Toggle superscript"
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            disabled={!editor.can().chain().focus().toggleSuperscript().run() || disabled}
            data-state={editor.isActive("superscript") ? "on" : "off"}
          >
            <SuperscriptIcon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="subscript"
            aria-label="Toggle subscript"
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            disabled={!editor.can().chain().focus().toggleSubscript().run() || disabled}
            data-state={editor.isActive("subscript") ? "on" : "off"}
          >
            <Subscript className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup type="single" size="sm" variant="outline">
          <ToggleGroupItem
            value="link"
            aria-label="Add link"
            onClick={() => {
              const url = window.prompt("Enter URL");
              if (url) {
                editor
                  .chain()
                  .focus()
                  .setLink({
                    href: url,
                    target: "_blank",
                    rel: "noopener noreferrer",
                  })
                  .run();
              }
            }}
            disabled={
              !editor
                .can()
                .chain()
                .focus()
                .setLink({ href: "https://example.com" })
                .run() || disabled
            }
            data-state={editor.isActive("link") ? "on" : "off"}
          >
            <LinkIcon className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="link"
            aria-label="Unset link"
            onClick={() => {
              editor.chain().focus().unsetLink().run();
            }}
            disabled={!editor.can().chain().focus().unsetLink().run() || disabled}
          >
            <Unlink className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup type="single" size="sm" variant="outline">
          <ToggleGroupItem
            value="left"
            aria-label="Align left"
            onClick={() => setAlign("left")}
            disabled={!editor.can().chain().focus().setTextAlign("left").run() || disabled}
            data-state={editor.isActive({ textAlign: "left" }) ? "on" : "off"}
          >
            <AlignLeft className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="center"
            aria-label="Align center"
            onClick={() => setAlign("center")}
            disabled={
              !editor.can().chain().focus().setTextAlign("center").run() || disabled
            }
            data-state={editor.isActive({ textAlign: "center" }) ? "on" : "off"}
          >
            <AlignCenter className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="right"
            aria-label="Align right"
            onClick={() => setAlign("right")}
            disabled={!editor.can().chain().focus().setTextAlign("right").run() || disabled}
            data-state={editor.isActive({ textAlign: "right" }) ? "on" : "off"}
          >
            <AlignRight className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="justify"
            aria-label="Align justify"
            onClick={() => setAlign("justify")}
            disabled={
              !editor.can().chain().focus().setTextAlign("justify").run() || disabled
            }
            data-state={
              editor.isActive({ textAlign: "justify" }) ? "on" : "off"
            }
          >
            <AlignJustify className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <ToggleGroup type="single" size="sm" variant="outline">
          <ToggleGroupItem
            value="undo"
            aria-label="Undo"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().chain().focus().undo().run() || disabled}
          >
            <Undo className="size-4" />
          </ToggleGroupItem>
          <ToggleGroupItem
            value="redo"
            aria-label="Redo"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().chain().focus().redo().run() || disabled}
          >
            <Redo className="size-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <EditorContent editor={editor} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Insert image</DialogTitle>
            <DialogDescription>
              Drop or select image file(s) to insert into the editor.
            </DialogDescription>
          </DialogHeader>

          <Dropzone
            accept={{
              "image/png": [".png"],
              "image/jpeg": [".jpg", ".jpeg"],
              "image/gif": [".gif"],
              "image/webp": [".webp"],
            }}
            onDrop={(files) => {
              files.forEach((file) =>
                handleImageChange(file, editor, editor.state.selection.anchor)
              );
            }}
            onError={(err) => toast.error(err.message)}
          >
            <DropzoneEmptyState>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ImageIcon className="mb-2 size-6" />
                <p className="text-muted-foreground text-sm">
                  Drag & drop image files here, or click to browse
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  PNG, JPG, GIF, WEBP
                </p>
              </div>
            </DropzoneEmptyState>
            <DropzoneContent />
          </Dropzone>

          <DialogFooter>
            <p className="text-muted-foreground text-xs">
              Tip: Did you know? You can drop or paste images directly into the
              editor instead of uploading it here.
            </p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export { TextEditor };

const Image = TiptapImage.extend<ImageOptions>({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
      },
      "data-align": {
        default: null,
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView, {
      stopEvent: (props) => {
        if (/dragstart|dragover|dragend|drop/.test(props.event.type))
          return false;
        return !/mousedown|drag|drop/.test(props.event.type);
      },
    });
  },
});

interface ResizeParams {
  handleUsed: "left" | "right";
  initialWidth: number;
  initialClientX: number;
}

interface ResizableImageProps extends React.HTMLAttributes<HTMLDivElement> {
  src: string;
  alt?: string;
  editor?: Editor;
  minWidth?: number;
  maxWidth?: number;
  align?: "left" | "center" | "right";
  initialWidth?: number;
  onImageResize?: (width?: number) => void;
}

function ImageNodeView(props: NodeViewProps) {
  const { editor, node, updateAttributes } = props;

  return (
    <ResizableImage
      src={node.attrs.src}
      alt={node.attrs.alt || ""}
      editor={editor}
      align={node.attrs["data-align"]}
      initialWidth={node.attrs.width}
      onImageResize={(width) => updateAttributes({ width })}
    />
  );
}

const ResizableImage: React.FC<ResizableImageProps> = ({
  src,
  alt = "",
  editor,
  minWidth = 96,
  maxWidth = 800,
  align = "left",
  initialWidth,
  onImageResize,
}) => {
  const [resizeParams, setResizeParams] = React.useState<
    ResizeParams | undefined
  >(undefined);
  const [width, setWidth] = React.useState<number | undefined>(initialWidth);
  const [showHandles, setShowHandles] = React.useState<boolean>(false);

  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const leftResizeHandleRef = React.useRef<HTMLDivElement>(null);
  const rightResizeHandleRef = React.useRef<HTMLDivElement>(null);
  const imageRef = React.useRef<HTMLImageElement>(null);

  const windowMouseMoveHandler = React.useCallback(
    (event: MouseEvent): void => {
      if (!resizeParams || !editor) return;

      let newWidth: number;

      if (align === "center") {
        if (resizeParams.handleUsed === "left") {
          newWidth =
            resizeParams.initialWidth +
            (resizeParams.initialClientX - event.clientX) * 2;
        } else {
          newWidth =
            resizeParams.initialWidth +
            (event.clientX - resizeParams.initialClientX) * 2;
        }
      } else {
        if (resizeParams.handleUsed === "left") {
          newWidth =
            resizeParams.initialWidth +
            resizeParams.initialClientX -
            event.clientX;
        } else {
          newWidth =
            resizeParams.initialWidth +
            event.clientX -
            resizeParams.initialClientX;
        }
      }

      const effectiveMinWidth = minWidth;
      const effectiveMaxWidth =
        editor.view.dom?.firstElementChild?.clientWidth || maxWidth;

      const newCalculatedWidth = Math.min(
        Math.max(newWidth, effectiveMinWidth),
        effectiveMaxWidth
      );

      setWidth(newCalculatedWidth);
      if (wrapperRef.current) {
        wrapperRef.current.style.width = `${newCalculatedWidth}px`;
      }
    },
    [editor, align, maxWidth, minWidth, resizeParams]
  );

  const windowMouseUpHandler = React.useCallback(
    (event: MouseEvent): void => {
      if (!editor) return;

      if (
        (!event.target ||
          !wrapperRef.current?.contains(event.target as Node) ||
          !editor.isEditable) &&
        showHandles
      ) {
        setShowHandles(false);
      }

      if (!resizeParams) return;

      setResizeParams(undefined);
      onImageResize?.(width);
    },
    [editor, showHandles, resizeParams, onImageResize, width]
  );

  const leftResizeHandleMouseDownHandler = (
    event: React.MouseEvent<HTMLDivElement>
  ): void => {
    event.preventDefault();
    setResizeParams({
      handleUsed: "left",
      initialWidth: wrapperRef.current?.clientWidth || Number.MAX_VALUE,
      initialClientX: event.clientX,
    });
  };

  const rightResizeHandleMouseDownHandler = (
    event: React.MouseEvent<HTMLDivElement>
  ): void => {
    event.preventDefault();
    setResizeParams({
      handleUsed: "right",
      initialWidth: wrapperRef.current?.clientWidth || Number.MAX_VALUE,
      initialClientX: event.clientX,
    });
  };

  const wrapperMouseEnterHandler = (): void => {
    if (editor && editor.isEditable) setShowHandles(true);
  };

  const wrapperMouseLeaveHandler = (
    event: React.MouseEvent<HTMLDivElement>
  ): void => {
    if (
      event.relatedTarget === leftResizeHandleRef.current ||
      event.relatedTarget === rightResizeHandleRef.current
    ) {
      return;
    }
    if (resizeParams) return;
    if (editor && editor.isEditable) setShowHandles(false);
  };

  React.useEffect(() => {
    window.addEventListener("mousemove", windowMouseMoveHandler);
    window.addEventListener("mouseup", windowMouseUpHandler);
    return () => {
      window.removeEventListener("mousemove", windowMouseMoveHandler);
      window.removeEventListener("mouseup", windowMouseUpHandler);
    };
  }, [windowMouseMoveHandler, windowMouseUpHandler]);

  return (
    <NodeViewWrapper
      onMouseEnter={wrapperMouseEnterHandler}
      onMouseLeave={wrapperMouseLeaveHandler}
      data-align={align}
      data-width={width}
      className={cn(
        "my-6 flex w-full",
        align === "right" && "justify-end text-right",
        align === "center" && "justify-center text-center"
      )}
      contentEditable={false}
    >
      <div
        ref={wrapperRef}
        className="flex cursor-pointer flex-col rounded select-none in-[.ProseMirror-selectednode]:ring-2 in-[.ProseMirror-selectednode]:ring-purple-500"
        style={{
          width: width ? `${width}px` : "fit-content",
        }}
      >
        <div className="relative flex max-w-full items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={src}
            alt={alt}
            className="w-full rounded"
            contentEditable={false}
            draggable={false}
          />

          {showHandles && editor && editor.isEditable && (
            <>
              <div
                ref={leftResizeHandleRef}
                className="absolute top-1/2 left-1 z-10 h-12 w-1.5 -translate-y-1/2 cursor-ew-resize rounded-full bg-purple-500"
                onMouseDown={leftResizeHandleMouseDownHandler}
              />
              <div
                ref={rightResizeHandleRef}
                className="absolute top-1/2 right-1 z-10 h-12 w-1.5 -translate-y-1/2 cursor-ew-resize rounded-full bg-purple-500"
                onMouseDown={rightResizeHandleMouseDownHandler}
              />
            </>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
};
