import { Check } from "lucide-react";
import { DemoQuiz } from "./DemoQuiz";

const points = [
  "Phản hồi tức thì, sai không bị phạt",
  "Gợi ý từng bước thay vì cho đáp án ngay",
  "Sao, XP và huy hiệu sau mỗi bài",
];

export function TrySection() {
  return (
    <section id="hoc-thu" aria-labelledby="hoc-thu-title" className="relative isolate overflow-hidden py-20">
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-b from-cream via-cloud to-cream" />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="font-display text-lg font-bold text-orange">Học thử ngay</p>
          <h2 id="hoc-thu-title" className="mt-2 text-4xl font-extrabold sm:text-5xl">
            Thử một câu hỏi xem sao!
          </h2>
          <p className="mt-4 text-ink/70">
            Đây là một bài tập thật trong bài “Cộng có nhớ”. Hãy để con tự bấm chọn và xem hocde.vn phản hồi như thế nào.
          </p>
          <ul className="mt-6 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 font-bold">
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-grass text-white">
                  <Check aria-hidden size={16} strokeWidth={3.5} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <DemoQuiz />
      </div>
    </section>
  );
}
