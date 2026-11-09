import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpenText, Calculator, Code2, Flame, Languages, Star, Zap, Users } from "lucide-react";
import { Avatar } from "@/components/profile/Avatar";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { getActiveProfile, getProfiles, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Học thôi nào!", robots: { index: false, follow: false } };

const API = process.env.API_INTERNAL_URL ?? "http://localhost:8080";
type Subject = { slug: string; name: string; description: string | null };

const look: Record<string, { icon: typeof Calculator; bg: string }> = {
  toan: { icon: Calculator, bg: "bg-sky" },
  "tieng-viet": { icon: BookOpenText, bg: "bg-berry" },
  "tieng-anh": { icon: Languages, bg: "bg-grass" },
  python: { icon: Code2, bg: "bg-grape" },
};

async function getSubjects(): Promise<Subject[]> {
  try {
    const res = await fetch(`${API}/api/v1/subjects`, { next: { revalidate: 300 } });
    return res.ok ? (await res.json()).data : [];
  } catch {
    return [];
  }
}

export default async function LearnHome(props: PageProps<"/hoc">) {
  const sp = await props.searchParams;
  await requireUser("/hoc", sp.renewed === "1");

  const profiles = await getProfiles();
  if (profiles.length === 0) redirect("/phu-huynh?moi=1");
  const profile = await getActiveProfile();
  if (!profile) redirect("/chon-ho-so");
  const subjects = await getSubjects();

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/" aria-label="Về trang chủ"><Image src="/brand/logo.png" alt="hocde.vn" width={150} height={58} className="h-10 w-auto" /></Link>
        <div className="flex items-center gap-2">
          <Link href="/chon-ho-so" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 font-bold ring-2 ring-ink/10 hover:bg-cloud"><Users aria-hidden size={18} /> Đổi bé</Link>
          <Link href="/phu-huynh" className="hidden min-h-11 items-center rounded-xl px-3 font-bold text-ink/70 hover:bg-white sm:inline-flex">Phụ huynh</Link>
          <LogoutButton />
        </div>
      </header>

      <section className="relative isolate mt-8 overflow-hidden rounded-blob bg-gradient-to-br from-sky/30 via-white to-sun/40 p-6 shadow-soft ring-1 ring-brand/10 sm:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <Avatar avatarKey={profile.avatar_key} size="lg" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-4xl font-extrabold sm:text-5xl">Chào {profile.display_name}!</h1>
            <p className="text-lg text-ink/70">Lớp {profile.grade} · Hôm nay mình học gì nào?</p>
          </div>
        </div>
        <ul className="mt-6 grid grid-cols-3 gap-3 text-center">
          <li className="rounded-2xl bg-white p-3 ring-1 ring-ink/5"><Flame aria-hidden className="mx-auto text-orange" fill="currentColor" /><p className="font-display text-2xl font-extrabold">{profile.current_streak}</p><p className="text-sm text-ink/60">ngày liên tiếp</p></li>
          <li className="rounded-2xl bg-white p-3 ring-1 ring-ink/5"><Star aria-hidden className="mx-auto text-sun" fill="currentColor" /><p className="font-display text-2xl font-extrabold">{profile.stars}</p><p className="text-sm text-ink/60">sao</p></li>
          <li className="rounded-2xl bg-white p-3 ring-1 ring-ink/5"><Zap aria-hidden className="mx-auto text-brand" fill="currentColor" /><p className="font-display text-2xl font-extrabold">{profile.total_xp}</p><p className="text-sm text-ink/60">điểm XP</p></li>
        </ul>
      </section>

      <section aria-labelledby="mon" className="mt-10">
        <h2 id="mon" className="text-3xl font-extrabold">Chọn môn học</h2>
        <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
          {subjects.map((s) => {
            const l = look[s.slug] ?? look.toan;
            return (
              <li key={s.slug} className={`relative flex min-h-44 flex-col items-center justify-center gap-3 rounded-blob p-4 text-center text-white shadow-soft ${l.bg}`}>
                <l.icon aria-hidden size={44} strokeWidth={2.2} />
                <span className="font-display text-xl font-extrabold">{s.name}</span>
                <span className="rounded-full bg-white/25 px-3 py-0.5 text-xs font-extrabold">Sắp có bài học</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 text-center text-ink/60">Bài học đầu tiên đang được chuẩn bị. Bé quay lại sớm nhé! 🎉</p>
      </section>
    </main>
  );
}
