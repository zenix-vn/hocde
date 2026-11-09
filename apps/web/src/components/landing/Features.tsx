import { Blocks, Volume2, Terminal, Flame, GraduationCap, Smartphone } from "lucide-react";

const features = [
  { icon: Blocks, title: "Mô phỏng trực quan", desc: "Que tính, trục số, đồng hồ, phân số, hình học — con tự tay kéo thả để thấy vì sao.", color: "text-sky bg-sky/15" },
  { icon: Volume2, title: "Có giọng đọc & phát âm", desc: "Bài đọc tô sáng từng chữ, từ vựng tiếng Anh có phát âm, luyện nói với micro.", color: "text-berry bg-berry/15" },
  { icon: Terminal, title: "Viết code ngay trên web", desc: "Python chạy trực tiếp trên trình duyệt, không cần cài đặt, lỗi giải thích bằng tiếng Việt.", color: "text-grape bg-grape/15" },
  { icon: Flame, title: "Sao, XP & chuỗi ngày học", desc: "Phần thưởng nhẹ nhàng, khuyến khích kiên trì, không có “hết tim” làm con bị chặn học.", color: "text-orange bg-orange/15" },
  { icon: GraduationCap, title: "Lộ trình theo từng lớp", desc: "Chia chương, chia bài nhỏ. Con luôn biết mình đang ở đâu và học gì tiếp theo.", color: "text-brand bg-brand/10" },
  { icon: Smartphone, title: "Học trên mọi thiết bị", desc: "Giao diện cho điện thoại, máy tính bảng và máy tính, nút bấm to, dễ thao tác.", color: "text-grass bg-grass/15" },
];

export function Features() {
  return (
    <section aria-labelledby="tinh-nang-title" className="mx-auto max-w-6xl px-4 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="font-display text-lg font-bold text-orange">Tính năng</p>
        <h2 id="tinh-nang-title" className="mt-2 text-4xl font-extrabold sm:text-5xl">
          Được thiết kế để trẻ thích học
        </h2>
      </div>
      <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <li key={f.title} className="rounded-blob bg-white p-6 shadow-sm ring-1 ring-ink/5 transition hover:-translate-y-1 hover:shadow-soft">
            <span className={`grid size-14 place-items-center rounded-2xl ${f.color}`}>
              <f.icon aria-hidden size={28} strokeWidth={2.4} />
            </span>
            <h3 className="mt-4 text-xl font-extrabold">{f.title}</h3>
            <p className="mt-1 text-ink/70">{f.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
