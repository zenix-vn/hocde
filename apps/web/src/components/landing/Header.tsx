import Image from "next/image";
import Link from "next/link";
import { Menu } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";

const nav = [
  { href: "#mon-hoc", label: "Môn học" },
  { href: "#cach-hoc", label: "Cách học" },
  { href: "#hoc-thu", label: "Học thử" },
  { href: "#phu-huynh", label: "Phụ huynh" },
  { href: "#hoi-dap", label: "Hỏi đáp" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-brand/10 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" aria-label="hocde.vn – Trang chủ" className="shrink-0">
          <Image src="/brand/logo.png" alt="hocde.vn" width={150} height={58} priority className="h-10 w-auto" />
        </Link>

        <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <a key={n.href} href={n.href} className="rounded-xl px-3 py-2 font-bold text-ink/80 transition hover:bg-brand/10 hover:text-brand">
              {n.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/dang-nhap" className="hidden rounded-xl px-3 py-2 font-bold text-ink/80 transition hover:bg-brand/10 hover:text-brand sm:block">
            Đăng nhập
          </Link>
          <ButtonLink href="/dang-ky" className="!min-h-11 !px-5 !py-2 !text-base">
            Đăng ký
          </ButtonLink>
          <details className="relative md:hidden">
            <summary aria-label="Mở menu" className="grid size-11 cursor-pointer list-none place-items-center rounded-xl bg-white text-brand ring-2 ring-brand/15">
              <Menu aria-hidden size={22} />
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-soft ring-1 ring-brand/10">
              {nav.map((n) => (
                <a key={n.href} href={n.href} className="block rounded-xl px-4 py-3 font-bold hover:bg-cloud">
                  {n.label}
                </a>
              ))}
              <Link href="/dang-nhap" className="block rounded-xl px-4 py-3 font-bold text-brand hover:bg-cloud">
                Đăng nhập
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
