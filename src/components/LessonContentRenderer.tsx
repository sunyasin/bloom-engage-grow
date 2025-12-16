import React, { useMemo } from "react";
import VideoPlayer from "@/components/VideoPlayer";

function extractVideoSrc(videoHtml: string): string | null {
  // 1) <video src="...">
  const direct = videoHtml.match(/<video[^>]*\ssrc=("|')([^"']+)("|')[^>]*>/i);
  if (direct?.[2]) return direct[2];

  // 2) <source src="...">
  const source = videoHtml.match(/<source[^>]*\ssrc=("|')([^"']+)("|')[^>]*>/i);
  if (source?.[2]) return source[2];

  return null;
}

export default function LessonContentRenderer({
  html,
  lessonId,
  className,
}: {
  html: string;
  lessonId?: string;
  className?: string;
}) {
  const parts = useMemo(() => {
    const input = html || "";
    const result: Array<
      | { type: "html"; content: string }
      | { type: "video"; src: string; raw: string }
    > = [];

    const re = /<video\b[\s\S]*?<\/video>/gi;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = re.exec(input))) {
      const start = match.index;
      const end = re.lastIndex;

      const before = input.slice(lastIndex, start);
      if (before.trim().length > 0) result.push({ type: "html", content: before });

      const rawVideo = match[0];
      const src = extractVideoSrc(rawVideo);
      if (src) result.push({ type: "video", src, raw: rawVideo });
      else result.push({ type: "html", content: rawVideo });

      lastIndex = end;
    }

    const after = input.slice(lastIndex);
    if (after.trim().length > 0) result.push({ type: "html", content: after });

    // Preserve empty content
    if (result.length === 0) result.push({ type: "html", content: input });

    return result;
  }, [html]);

  return (
    <article className={className}>
      {parts.map((p, idx) => {
        if (p.type === "video") {
          return (
            <div key={`video-${idx}`} className="not-prose my-4">
              <VideoPlayer src={p.src} lessonId={lessonId} />
            </div>
          );
        }

        return (
          <div
            key={`html-${idx}`}
            dangerouslySetInnerHTML={{ __html: p.content }}
          />
        );
      })}
    </article>
  );
}
