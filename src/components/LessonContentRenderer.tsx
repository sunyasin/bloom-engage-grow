import React, { useMemo } from "react";
import VideoPlayer from "@/components/VideoPlayer";

function normalizeLessonVideoSrc(src: string): string {
  // If HTML contains a public URL to the private bucket, convert it back to storage path
  const marker = "/storage/v1/object/public/lesson-videos/";
  const idx = src.indexOf(marker);
  if (idx !== -1) {
    return src.slice(idx + marker.length);
  }
  return src;
}

function extractVideoSrc(videoHtml: string): string | null {
  // 1) <video src="...">
  const direct = videoHtml.match(/<video[^>]*\ssrc=("|')([^"']+)("|')[^>]*>/i);
  if (direct?.[2]) return normalizeLessonVideoSrc(direct[2]);

  // 2) <source src="...">
  const source = videoHtml.match(/<source[^>]*\ssrc=("|')([^"']+)("|')[^>]*>/i);
  if (source?.[2]) return normalizeLessonVideoSrc(source[2]);

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
    <article className={`prose prose-sm sm:prose dark:prose-invert max-w-none ${className || ''}`}>
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
            className="prose prose-sm sm:prose dark:prose-invert max-w-none prose-headings:font-semibold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-ul:list-disc prose-ol:list-decimal prose-li:my-1"
            dangerouslySetInnerHTML={{ __html: p.content }}
          />
        );
      })}
    </article>
  );
}
