import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { STATUS_LABEL, STATUS_TONE, type Meta } from "@/lib/admin-types";

export function PageTitle({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {sub && <p className="mt-1 text-base text-ink/65">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, children, className = "", actions }: { title?: string; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink/10 ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex items-center justify-between gap-3">
          {title && <h2 className="text-xl font-extrabold">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = "brand" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "brand" | "grass" | "orange" | "grape" }) {
  const bar = { brand: "bg-brand", grass: "bg-grass", orange: "bg-orange", grape: "bg-grape" }[tone];
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-ink/10">
      <span className={`absolute inset-y-0 left-0 w-1.5 ${bar}`} aria-hidden />
      <p className="text-sm font-bold text-ink/60">{label}</p>
      <p className="font-display text-3xl font-extrabold leading-tight">{value}</p>
      {hint && <p className="text-sm text-ink/55">{hint}</p>}
    </div>
  );
}

export function Badge({ children, className = "bg-ink/10 text-ink/70" }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-bold ${className}`}>{children}</span>;
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge className={STATUS_TONE[status] ?? ""}>{STATUS_LABEL[status] ?? status}</Badge>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl bg-cloud/60 p-6 text-center text-base text-ink/60">{children}</p>;
}

export const tableCls = "w-full min-w-[640px] text-left text-base";
export const thCls = "whitespace-nowrap border-b border-ink/10 px-3 py-2 text-sm font-bold text-ink/60";
export const tdCls = "border-b border-ink/5 px-3 py-2.5 align-middle";

/** Phân trang bằng liên kết; `href(page)` trả về URL của trang đó. */
export function Pager({ meta, href }: { meta?: Meta; href: (page: number) => string }) {
  if (!meta) return null;
  const pages = Math.max(1, Math.ceil(meta.total / meta.page_size));
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.page_size + 1;
  const to = Math.min(meta.total, meta.page * meta.page_size);
  const btn = "inline-flex min-h-10 items-center gap-1 rounded-xl px-3 font-bold ring-1 ring-ink/15";
  return (
    <nav aria-label="Phân trang" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-base">
      <p className="text-ink/60">{meta.total === 0 ? "Không có kết quả" : `${from}–${to} / ${meta.total}`}</p>
      <div className="flex items-center gap-2">
        {meta.page > 1 ? (
          <Link href={href(meta.page - 1)} className={`${btn} bg-white hover:bg-cloud`}><ChevronLeft aria-hidden size={18} /> Trước</Link>
        ) : (
          <span className={`${btn} opacity-40`}><ChevronLeft aria-hidden size={18} /> Trước</span>
        )}
        <span className="px-1 text-ink/60">Trang {meta.page}/{pages}</span>
        {meta.page < pages ? (
          <Link href={href(meta.page + 1)} className={`${btn} bg-white hover:bg-cloud`}>Sau <ChevronRight aria-hidden size={18} /></Link>
        ) : (
          <span className={`${btn} opacity-40`}>Sau <ChevronRight aria-hidden size={18} /></span>
        )}
      </div>
    </nav>
  );
}

export const inputCls =
  "min-h-11 w-full rounded-xl bg-white px-3 text-base ring-2 ring-ink/15 focus:ring-brand placeholder:text-ink/40 disabled:bg-ink/5";
export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 font-bold text-white transition hover:bg-brand-dark disabled:opacity-60";
export const btnGhost =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 font-bold text-ink/80 ring-2 ring-ink/10 transition hover:bg-cloud disabled:opacity-60";
export const btnDanger =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-berry/10 px-4 font-bold text-[#a02050] ring-2 ring-berry/30 transition hover:bg-berry/20 disabled:opacity-60";
