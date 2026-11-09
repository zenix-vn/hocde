import type { ReactNode } from "react";

// Markdown tối giản cho nội dung bài: đoạn văn, danh sách "- ", và **chữ đậm**.
// Không dùng dangerouslySetInnerHTML nên nội dung luôn an toàn.
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-extrabold text-brand-dark">{part.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export function Markdown({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        const items = lines.filter((l) => l.trimStart().startsWith("- "));
        if (items.length > 0 && items.length === lines.length) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-6">
              {items.map((l, j) => <li key={j}>{inline(l.trimStart().slice(2))}</li>)}
            </ul>
          );
        }
        // Dòng liền nhau: giữ xuống dòng, và nếu xen kẽ danh sách thì hiển thị từng dòng.
        return (
          <p key={i}>
            {lines.map((l, j) => (
              <span key={j}>
                {j > 0 && <br />}
                {l.trimStart().startsWith("- ") ? <>• {inline(l.trimStart().slice(2))}</> : inline(l)}
              </span>
            ))}
          </p>
        );
      })}
    </div>
  );
}
