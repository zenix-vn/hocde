import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" aria-label="Về trang chủ" className="block w-fit">
        <Image src="/brand/logo.png" alt="hocde.vn" width={150} height={58} className="h-10 w-auto" />
      </Link>
      <article className="mt-8 rounded-blob bg-white p-7 shadow-soft ring-1 ring-brand/10 sm:p-10 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-extrabold [&_li]:mt-1 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
        <h1 className="text-4xl font-extrabold">{title}</h1>
        <p className="mt-2 text-sm text-ink/60">Cập nhật lần cuối: {updated}</p>
        {children}
      </article>
    </main>
  );
}
