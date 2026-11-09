import { Calculator, BookOpenText, Languages, Code2 } from "lucide-react";

const subjects = [
  {
    name: "Toán",
    icon: Calculator,
    color: "bg-sky",
    soft: "bg-sky/15",
    text: "text-[#0a86ad]",
    grades: "Lớp 1–9",
    desc: "Que tính, trục số, đồng hồ, hình học kéo-thả. Hiểu bản chất con số thay vì học vẹt.",
    topics: ["Cộng trừ nhân chia", "Phân số", "Hình học", "Đại số THCS"],
  },
  {
    name: "Tiếng Việt",
    icon: BookOpenText,
    color: "bg-berry",
    soft: "bg-berry/10",
    text: "text-berry",
    grades: "Lớp 1–9",
    desc: "Ghép vần, tập đọc có giọng đọc mẫu, tập viết từng nét, mở rộng vốn từ qua trò chơi.",
    topics: ["Ghép vần", "Tập đọc", "Tập viết", "Ngữ văn THCS"],
  },
  {
    name: "Tiếng Anh",
    icon: Languages,
    color: "bg-grass",
    soft: "bg-grass/10",
    text: "text-[#1f9d3e]",
    grades: "Lớp 1–9",
    desc: "Flashcard có hình và phát âm, nghe – chọn, hội thoại ngắn, luyện nói với micro.",
    topics: ["Từ vựng", "Nghe – nói", "Hội thoại", "Ngữ pháp"],
  },
  {
    name: "Lập trình Python",
    icon: Code2,
    color: "bg-grape",
    soft: "bg-grape/10",
    text: "text-grape",
    grades: "Từ lớp 6",
    desc: "Viết code ngay trên trình duyệt, điều khiển chú rùa vẽ hình, lỗi báo bằng tiếng Việt dễ hiểu.",
    topics: ["print & biến", "if / else", "Vòng lặp", "Turtle"],
  },
];

export function Subjects() {
  return (
    <section id="mon-hoc" aria-labelledby="mon-hoc-title" className="mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-display text-lg font-bold text-orange">Môn học</p>
        <h2 id="mon-hoc-title" className="mt-2 text-4xl font-extrabold sm:text-5xl">
          Bốn môn học, một nơi học
        </h2>
        <p className="mt-4 text-ink/70">
          Chương trình bám sát lớp 1–9, chia thành các chương nhỏ để con học từng bước, chắc từng phần.
        </p>
      </div>

      <ul className="mt-12 grid gap-6 sm:grid-cols-2">
        {subjects.map((s) => (
          <li key={s.name}>
            <article className={`group h-full rounded-blob ${s.soft} p-6 ring-1 ring-ink/5 transition hover:-translate-y-1 hover:shadow-soft`}>
              <div className="flex items-start justify-between gap-4">
                <span className={`grid size-16 place-items-center rounded-2xl ${s.color} text-white shadow-lg transition group-hover:rotate-6`}>
                  <s.icon aria-hidden size={32} strokeWidth={2.4} />
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-extrabold text-ink/70 ring-1 ring-ink/10">
                  {s.grades}
                </span>
              </div>
              <h3 className={`mt-5 text-3xl font-extrabold ${s.text}`}>{s.name}</h3>
              <p className="mt-2 text-ink/75">{s.desc}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {s.topics.map((t) => (
                  <li key={t} className="rounded-full bg-white px-3 py-1 text-sm font-bold text-ink/70 ring-1 ring-ink/10">
                    {t}
                  </li>
                ))}
              </ul>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
