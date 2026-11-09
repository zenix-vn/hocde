import { Eye, MousePointerClick, Trophy } from "lucide-react";

const steps = [
  {
    icon: Eye,
    title: "Xem & hiểu",
    desc: "Linh vật dẫn dắt từng bước bằng hình ảnh, hoạt hình và giọng đọc. Mỗi bài chỉ một mục tiêu nhỏ.",
    color: "bg-sky",
  },
  {
    icon: MousePointerClick,
    title: "Thử & làm",
    desc: "Kéo thả, nối cặp, điền số, gõ code… 13 dạng bài tập tương tác, sai thì có gợi ý nhẹ nhàng.",
    color: "bg-orange",
  },
  {
    icon: Trophy,
    title: "Nhận thưởng",
    desc: "Mỗi bài hoàn thành được 1–3 sao, điểm XP và huy hiệu. Giữ chuỗi ngày học để lên cấp.",
    color: "bg-grass",
  },
];

export function HowItWorks() {
  return (
    <section id="cach-hoc" aria-labelledby="cach-hoc-title" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-display text-lg font-bold text-orange">Cách học</p>
          <h2 id="cach-hoc-title" className="mt-2 text-4xl font-extrabold sm:text-5xl">
            Mỗi bài học là một cuộc phiêu lưu nhỏ
          </h2>
        </div>

        <ol className="relative mt-14 grid gap-8 md:grid-cols-3">
          <div aria-hidden className="absolute left-[16%] right-[16%] top-10 hidden border-t-4 border-dotted border-brand/20 md:block" />
          {steps.map((s, i) => (
            <li key={s.title} className="relative text-center">
              <div className={`relative mx-auto grid size-20 place-items-center rounded-3xl ${s.color} text-white shadow-lg`}>
                <s.icon aria-hidden size={36} strokeWidth={2.4} />
                <span className="absolute -right-2 -top-2 grid size-8 place-items-center rounded-full bg-sun font-display text-lg font-extrabold text-ink ring-4 ring-white">
                  {i + 1}
                </span>
              </div>
              <h3 className="mt-5 text-2xl font-extrabold">{s.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-ink/70">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
