import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { TriangleAlert } from "lucide-react";
import { AUTH_ERRORS } from "@/lib/auth-errors";

export function AuthShell({ title, subtitle, error, children }: { title: string; subtitle: string; error?: string; children: ReactNode }) {
  const msg = error ? (AUTH_ERRORS[error] ?? AUTH_ERRORS.server) : null;
  return (
    <main className="relative isolate grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(50rem_30rem_at_90%_-10%,#bfe6ff_0%,transparent_60%),radial-gradient(40rem_30rem_at_-10%_90%,#ffe3a6_0%,transparent_55%)]" />
      <div className="w-full max-w-md">
        <Link href="/" aria-label="Về trang chủ hocde.vn" className="mx-auto mb-6 block w-fit">
          <Image src="/brand/logo.png" alt="hocde.vn" width={170} height={66} priority className="h-12 w-auto" />
        </Link>
        <div className="rounded-blob bg-white p-7 shadow-soft ring-1 ring-brand/10 sm:p-9">
          <Image src="/brand/mascot.png" alt="" width={72} height={70} className="mx-auto -mt-16 mb-2 animate-wiggle drop-shadow-lg" />
          <h1 className="text-center text-3xl font-extrabold">{title}</h1>
          <p className="mt-1 text-center text-ink/70">{subtitle}</p>
          {msg && (
            <p role="alert" className="mt-5 flex items-start gap-2 rounded-2xl bg-orange/15 p-4 text-[15px] font-bold text-[#8a4300]">
              <TriangleAlert aria-hidden size={20} className="mt-0.5 shrink-0" />
              {msg}
            </p>
          )}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  );
}
