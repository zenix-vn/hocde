import { Backpack, School } from "lucide-react";

export function Levels() {
  return (
    <section aria-labelledby="cap-hoc-title" className="bg-white py-20">
      <div className="mx-auto max-w-6xl px-4">
        <h2 id="cap-hoc-title" className="mx-auto max-w-2xl text-center text-4xl font-extrabold sm:text-5xl">
          Phù hợp từng độ tuổi
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <article className="rounded-blob bg-gradient-to-br from-sun/30 to-orange/20 p-8">
            <Backpack aria-hidden size={40} className="text-orange" />
            <h3 className="mt-4 text-3xl font-extrabold">Tiểu học · Lớp 1–5</h3>
            <p className="mt-2 text-ink/75">
              Chữ to, nhiều hình, có giọng đọc tự động. Câu hỏi ít lựa chọn, kéo thả đơn giản,
              linh vật đồng hành và cổ vũ ở từng bước.
            </p>
            <ul className="mt-5 grid gap-2 font-bold">
              <li>• Toán, Tiếng Việt, Tiếng Anh</li>
              <li>• Tập đọc, tập viết, ghép vần</li>
              <li>• Làm quen tin học &amp; tư duy lập trình</li>
            </ul>
          </article>
          <article className="rounded-blob bg-gradient-to-br from-sky/30 to-grape/20 p-8">
            <School aria-hidden size={40} className="text-brand" />
            <h3 className="mt-4 text-3xl font-extrabold">THCS · Lớp 6–9</h3>
            <p className="mt-2 text-ink/75">
              Giao diện gọn gàng hơn, bài tập nhiều bước, công cụ vẽ đồ thị và trình soạn code —
              vẫn tươi sáng, không “con nít” quá.
            </p>
            <ul className="mt-5 grid gap-2 font-bold">
              <li>• Toán đại số &amp; hình học, Ngữ văn, Tiếng Anh</li>
              <li>• Lập trình Python từ cơ bản</li>
              <li>• Ôn tập theo kỹ năng còn yếu</li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
