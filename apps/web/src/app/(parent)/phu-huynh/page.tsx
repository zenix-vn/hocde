import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LockButton } from "@/components/profile/LockButton";
import { PinForm } from "@/components/profile/PinForm";
import { ProfileManager } from "@/components/profile/ProfileManager";
import { getProfiles, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Khu vực phụ huynh", robots: { index: false, follow: false } };

export default async function ParentArea(props: PageProps<"/phu-huynh">) {
  const sp = await props.searchParams;
  const user = await requireUser("/phu-huynh", sp.renewed === "1");
  const gated = !user.has_pin || !user.unlocked;
  const profiles = gated ? [] : await getProfiles();

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-8">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" aria-label="Về trang chủ"><Image src="/brand/logo.png" alt="hocde.vn" width={150} height={58} className="h-10 w-auto" /></Link>
        <div className="flex items-center gap-2">
          {(user.role === "admin" || user.role === "editor") && (
            <Link href="/admin" className="inline-flex min-h-11 items-center rounded-xl bg-brand px-4 font-bold text-white hover:bg-brand-dark">Trang quản trị</Link>
          )}
          {!gated && <LockButton />}
        </div>
      </header>

      <div className="mt-8">
        <Link href="/hoc" className="inline-flex items-center gap-1 font-bold text-brand hover:underline"><ArrowLeft aria-hidden size={18} /> Về trang học</Link>
        <h1 className="mt-2 text-4xl font-extrabold">Khu vực phụ huynh</h1>
        <p className="mt-1 text-ink/70">Xin chào {user.full_name}! Quản lý hồ sơ của các bé tại đây.</p>
      </div>

      <section className="mt-8">
        {!user.has_pin ? (
          <PinForm mode="set" />
        ) : !user.unlocked ? (
          <PinForm mode="verify" canChange />
        ) : (
          <>
            <h2 className="mb-4 text-2xl font-extrabold">Hồ sơ của bé</h2>
            <ProfileManager profiles={profiles} startOpen={sp.moi === "1"} />
          </>
        )}
      </section>
    </main>
  );
}
