import { BarChart3, Timer, LockKeyhole, EyeOff } from "lucide-react";

const items = [
  { icon: BarChart3, title: "Theo dõi tiến độ", desc: "Thời gian học, số bài hoàn thành, kỹ năng làm tốt và cần luyện thêm." },
  { icon: Timer, title: "Giới hạn thời gian", desc: "Đặt số phút học mỗi ngày, trẻ được nhắc nghỉ mắt sau 20 phút." },
  { icon: LockKeyhole, title: "Khu phụ huynh có mã PIN", desc: "Cài đặt và báo cáo chỉ mở được khi nhập PIN của bố mẹ." },
  { icon: EyeOff, title: "Riêng tư & không quảng cáo", desc: "Hồ sơ trẻ chỉ cần biệt danh và lớp. Không chat công khai, không bán dữ liệu." },
];

export function Parents() {
  return (
    <section id="phu-huynh" aria-labelledby="phu-huynh-title" className="relative isolate overflow-hidden bg-brand py-20 text-white">
      <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-96 rounded-full bg-white/10" />
      <div aria-hidden className="absolute -bottom-32 -left-20 -z-10 size-96 rounded-full bg-sky/20" />
      <div className="mx-auto max-w-6xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <p className="font-display text-lg font-bold text-sun">Dành cho phụ huynh</p>
          <h2 id="phu-huynh-title" className="mt-2 text-4xl font-extrabold sm:text-5xl">
            Bố mẹ yên tâm, con học vui
          </h2>
          <p className="mt-4 text-white/85">
            Chúng tôi coi an toàn của trẻ em là ưu tiên số một, từ cách thiết kế sản phẩm đến cách xử lý dữ liệu.
          </p>
        </div>
        <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((i) => (
            <li key={i.title} className="rounded-blob bg-white/10 p-6 ring-1 ring-white/20 backdrop-blur">
              <span className="grid size-12 place-items-center rounded-2xl bg-sun text-ink">
                <i.icon aria-hidden size={24} strokeWidth={2.4} />
              </span>
              <h3 className="mt-4 text-xl font-extrabold">{i.title}</h3>
              <p className="mt-1 text-white/80">{i.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
