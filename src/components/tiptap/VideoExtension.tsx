import React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import VideoPlayer from "@/components/VideoPlayer";

export interface VideoOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: { src: string }) => ReturnType;
    };
  }
}

const normalizeLessonVideoSrc = (src: string) => {
  const marker = "/storage/v1/object/public/lesson-videos/";
  const idx = src.indexOf(marker);
  if (idx !== -1) return src.slice(idx + marker.length);
  return src;
};

const VideoNodeView = (props: any) => {
  const rawSrc = props?.node?.attrs?.src as string | null;
  const src = rawSrc ? normalizeLessonVideoSrc(rawSrc) : null;

  return (
    <NodeViewWrapper className="not-prose">
      {src ? <VideoPlayer src={src} /> : null}
    </NodeViewWrapper>
  );
};

export const Video = Node.create<VideoOptions>({
  name: "video",
  group: "block",
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: "w-full rounded-lg",
        controls: true,
      },
    };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element) => {
          const directSrc = element.getAttribute("src");
          if (directSrc) return directSrc;

          const source = element.querySelector("source");
          return source?.getAttribute("src") || null;
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "video",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    // Keep a valid HTML representation for storage/preview; runtime rendering uses NodeView.
    const attrs = mergeAttributes(this.options.HTMLAttributes, {
      controls: true,
      playsinline: "true",
      class: this.options.HTMLAttributes.class,
    });

    return ["video", attrs, ["source", { src: HTMLAttributes.src, type: "video/mp4" }]];
  },

  addNodeView() {
    return ReactNodeViewRenderer(VideoNodeView);
  },

  addCommands() {
    return {
      setVideo:
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

export default Video;
