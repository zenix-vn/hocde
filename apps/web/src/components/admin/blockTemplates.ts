import type { Block } from "@/lib/admin-types";

export type BlockKind = { key: string; label: string; make: (id: string) => Block };

// Mẫu khởi tạo cho từng loại khối; cấu trúc khớp với các bài trong thư mục content/.
export const BLOCK_KINDS: BlockKind[] = [
  { key: "mascot_say", label: "Linh vật nói", make: (id) => ({ id, type: "mascot_say", mascot: "fox", mood: "happy", text: "Chào bạn!" }) },
  { key: "text", label: "Văn bản", make: (id) => ({ id, type: "text", markdown: "Nội dung bài học…" }) },
  { key: "callout", label: "Ghi nhớ / lưu ý", make: (id) => ({ id, type: "callout", variant: "remember", markdown: "Điều cần nhớ…" }) },
  {
    key: "interactive",
    label: "Tương tác",
    make: (id) => ({ id, type: "interactive", kind: "flashcards", config: {} }),
  },
  {
    key: "mcq",
    label: "Bài tập: trắc nghiệm",
    make: (id) => ({
      id, type: "exercise", kind: "mcq", points: 10, skill: "ten-ky-nang",
      prompt: "Câu hỏi?",
      options: [{ id: "a", text: "Đáp án A" }, { id: "b", text: "Đáp án B" }, { id: "c", text: "Đáp án C" }],
      answer: { correct: ["a"] },
      hint: "Gợi ý cho bé.",
      explanation: "Giải thích vì sao đúng.",
    }),
  },
  {
    key: "true_false",
    label: "Bài tập: đúng / sai",
    make: (id) => ({ id, type: "exercise", kind: "true_false", points: 10, prompt: "Phát biểu cần xét đúng hay sai.", answer: { correct: true }, explanation: "Giải thích." }),
  },
  {
    key: "fill_blank",
    label: "Bài tập: điền chỗ trống",
    make: (id) => ({ id, type: "exercise", kind: "fill_blank", points: 10, prompt: "Điền từ còn thiếu: c_", answer: { accept: ["a"] }, hint: "Gợi ý.", explanation: "Giải thích." }),
  },
  {
    key: "order",
    label: "Bài tập: sắp xếp",
    make: (id) => ({
      id, type: "exercise", kind: "order", points: 10, prompt: "Sắp xếp theo đúng thứ tự:",
      options: [{ id: "x1", text: "Thứ nhất" }, { id: "x2", text: "Thứ hai" }],
      answer: { sequence: ["x1", "x2"] },
      explanation: "Giải thích.",
    }),
  },
  {
    key: "match",
    label: "Bài tập: nối cặp",
    make: (id) => ({
      id, type: "exercise", kind: "match", points: 10, prompt: "Nối các cặp tương ứng:",
      pairs: [{ left: "A", right: "1" }, { left: "B", right: "2" }],
      answer: { pairs: [["A", "1"], ["B", "2"]] },
      explanation: "Giải thích.",
    }),
  },
  { key: "summary", label: "Tổng kết (khối cuối)", make: (id) => ({ id, type: "summary", markdown: "Hôm nay bé đã học…" }) },
];

export const TYPE_LABEL: Record<string, string> = {
  mascot_say: "Linh vật nói",
  text: "Văn bản",
  callout: "Ghi nhớ",
  interactive: "Tương tác",
  exercise: "Bài tập",
  summary: "Tổng kết",
  image: "Hình ảnh",
  gallery: "Thư viện ảnh",
  video: "Video",
  audio: "Âm thanh",
  steps: "Các bước",
  code_demo: "Mã minh hoạ",
};

/** Sinh id khối chưa dùng: b1, b2, … */
export function nextBlockId(blocks: Block[]): string {
  const used = new Set(blocks.map((b) => b.id));
  for (let i = blocks.length + 1; ; i++) if (!used.has(`b${i}`)) return `b${i}`;
}
