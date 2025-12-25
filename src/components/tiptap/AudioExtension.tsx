import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { Trash2, Move, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export interface AudioOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    audio: {
      setAudio: (options: { src: string }) => ReturnType;
    };
  }
}

const AudioNodeView = (props: any) => {
  const { node, deleteNode, selected } = props;
  const src = node.attrs.src;
  
  const [isHovered, setIsHovered] = useState(false);

  return (
    <NodeViewWrapper className="relative my-4">
      <div
        className={`relative group ${selected ? "ring-2 ring-primary rounded-lg" : ""}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        draggable
      >
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
          <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Volume2 className="h-5 w-5 text-primary" />
          </div>
          <audio
            src={src}
            controls
            className="flex-1 h-10"
            style={{ minWidth: 0 }}
          />
        </div>
        
        {/* Controls overlay */}
        {(isHovered || selected) && (
          <div className="absolute top-2 right-2 flex gap-1 z-10">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-background/90 hover:bg-background shadow-md cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <Move className="h-4 w-4" />
            </Button>
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
      </div>
    </NodeViewWrapper>
  );
};

export const Audio = Node.create<AudioOptions>({
  name: "audio",
  group: "block",
  atom: true,
  draggable: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: "w-full",
        controls: true,
      },
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "audio[src]",
      },
      {
        tag: "audio",
        getAttrs: (element) => {
          const source = element.querySelector("source");
          return source ? { src: source.getAttribute("src") } : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const attrs = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
    return ["audio", attrs, ["source", { src: HTMLAttributes.src, type: "audio/mpeg" }]];
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioNodeView);
  },

  addCommands() {
    return {
      setAudio:
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

export default Audio;
