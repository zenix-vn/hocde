import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, GraduationCap, LayoutDashboard, ScrollText, Users } from "lucide-react";
import { LogoutButton } from "@/components/auth/LogoutButton";
import type { User } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/admin-types";

const NAV = [
  { key: "tong-quan", href: "/admin", label: "Tổng quan", icon: LayoutDashboard, adminOnly: true },
  { key: "nguoi-dung", href: "/admin/nguoi-dung", label: "Người dùng", icon: Users, adminOnly: true },
  { key: "hoc-sinh", href: "/admin/hoc-sinh", label: "Học sinh", icon: GraduationCap, adminOnly: true },
  { key: "noi-dung", href: "/admin/noi-dung", label: "Nội dung", icon: BookOpen, adminOnly: false },
  { key: "nhat-ky", href: "/admin/nhat-ky", label: "Nhật ký", icon: ScrollText, adminOnly: true },
] as const;

export type NavKey = (typeof NAV)[number]["key"];

export function AdminShell({ user, active, children }: { user: User; active: NavKey; children: ReactNode }) {
  const items = NAV.filter((n) => !n.adminOnly || user.role === "admin");
  return (
    <div className="min-h-dvh bg-cloud/40 lg:grid lg:grid-cols-[15rem_1fr]">
      <aside className="border-b border-ink/10 bg-white lg:sticky lg:top-0 lg:h-dvh lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-3 px-4 py-3 lg:flex-col lg:items-start lg:gap-1 lg:py-5">
          <Link href="/admin" aria-label="Trang quản trị">
            <Image src="/brand/logo.png" alt="hocde.vn" width={150} height={58} className="h-9 w-auto" />
          </Link>
          <p className="text-sm font-bold text-ink/55">Quản trị · {ROLE_LABEL[user.role] ?? user.role}</p>
        </div>
        <nav aria-label="Menu quản trị" className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:pb-0">
          {items.map(({ key, href, label, icon: Icon }) => (
            <Link
              key={key}
              href={href}
              aria-current={key === active ? "page" : undefined}
              className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 font-bold transition ${
                key === active ? "bg-brand text-white" : "text-ink/75 hover:bg-cloud"
              }`}
            >
              <Icon aria-hidden size={20} /> {label}
            </Link>
          ))}
        </nav>
        <div className="hidden px-3 pt-6 lg:absolute lg:bottom-0 lg:left-0 lg:block lg:w-full lg:space-y-2 lg:p-3">
          <p className="truncate px-1 text-sm text-ink/60" title={user.email}>{user.full_name}</p>
          <Link href="/hoc" className="block rounded-xl px-3 py-2 text-base font-bold text-brand hover:bg-cloud">← Về trang học</Link>
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}
