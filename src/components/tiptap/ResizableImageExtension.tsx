import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { GripVertical, Trash2, Move } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";

export interface ResizableImageOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    resizableImage: {
      setResizableImage: (options: { src: string; alt?: string; width?: number }) => ReturnType;
    };
  }
}

const ResizableImageNodeView = (props: any) => {
  const { node, deleteNode, updateAttributes, selected } = props;
  const src = node.attrs.src;
  const alt = node.attrs.alt || "";
  const width = node.attrs.width;
  
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = containerRef.current?.offsetWidth || 300;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diff = moveEvent.clientX - startXRef.current;
      const newWidth = Math.max(100, startWidthRef.current + diff);
      updateAttributes({ width: newWidth });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <NodeViewWrapper className="relative inline-block my-2" draggable data-drag-handle>
      <div
        ref={containerRef}
        className={`relative group inline-block ${selected ? "ring-2 ring-primary rounded-lg" : ""}`}
        style={{ width: width ? `${width}px` : "auto", maxWidth: "100%" }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <img
          src={src}
          alt={alt}
          className="max-w-full rounded-lg block"
          style={{ width: "100%", height: "auto" }}
        />
        
        {/* Controls overlay */}
        {(isHovered || selected) && !isResizing && (
          <div className="absolute top-2 right-2 flex gap-1 z-10">
            <div
              className="h-8 w-8 bg-background/90 hover:bg-background shadow-md cursor-grab active:cursor-grabbing rounded-md flex items-center justify-center"
              data-drag-handle
            >
              <Move className="h-4 w-4" />
            </div>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8 shadow-md"
              onClick={(e) => {
                e.stopPropagation();
                deleteNode();
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Resize handle */}
        {(isHovered || selected || isResizing) && (
          <div
            className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize flex items-center justify-center bg-primary/20 hover:bg-primary/40 rounded-r-lg transition-colors"
            onMouseDown={handleResizeStart}
          >
            <GripVertical className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
};

export const ResizableImage = Node.create<ResizableImageOptions>({
  name: "resizableImage",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: "max-w-full rounded-lg",
      },
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: "",
      },
      width: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
    if (attrs.width) {
      attrs.style = `width: ${attrs.width}px; max-width: 100%;`;
    }
    return ["img", attrs];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageNodeView);
  },

  addCommands() {
    return {
      setResizableImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});

export default ResizableImage;
