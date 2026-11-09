import Image from "next/image";

export function Footer() {
  return (
    <footer className="border-t border-brand/10 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Image src="/brand/logo.png" alt="hocde.vn" width={150} height={58} className="h-11 w-auto" />
          <p className="mt-3 max-w-xs text-ink/70">
            Bài giảng dễ hiểu – Học tập hiệu quả. Học Toán, Tiếng Việt, Tiếng Anh và Python cho học sinh lớp 1–9.
          </p>
        </div>
        <nav aria-label="Môn học">
          <p className="font-display text-lg font-extrabold">Môn học</p>
          <ul className="mt-3 space-y-2 text-ink/70">
            <li>Toán</li>
            <li>Tiếng Việt</li>
            <li>Tiếng Anh</li>
            <li>Lập trình Python</li>
          </ul>
        </nav>
        <nav aria-label="Liên kết">
          <p className="font-display text-lg font-extrabold">Khám phá</p>
          <ul className="mt-3 space-y-2 text-ink/70">
            <li><a className="hover:text-brand" href="#cach-hoc">Cách học</a></li>
            <li><a className="hover:text-brand" href="#phu-huynh">Dành cho phụ huynh</a></li>
            <li><a className="hover:text-brand" href="#hoi-dap">Hỏi đáp</a></li>
            <li><a className="hover:text-brand" href="/dieu-khoan">Điều khoản sử dụng</a></li>
            <li><a className="hover:text-brand" href="/chinh-sach-bao-mat">Chính sách bảo mật</a></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-brand/10 py-5 text-center text-sm text-ink/60">
        © {new Date().getFullYear()} hocde.vn · Học vui mỗi ngày
      </div>
    </footer>
  );
}
