import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Clock, Zap } from "lucide-react";
import { getActiveProfile, requireUser } from "@/lib/auth";
import { getCourse } from "@/lib/learn";

export const metadata: Metadata = { title: "Danh sách bài học", robots: { index: false, follow: false } };

export default async function SubjectPage(props: PageProps<"/hoc/[subject]">) {
  const { subject } = await props.params;
  const sp = await props.searchParams;
  await requireUser(`/hoc/${subject}`, sp.renewed === "1");
  const profile = await getActiveProfile();
  if (!profile) redirect("/chon-ho-so");

  const course = await getCourse(subject, profile.grade);

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-4 py-6">
      <Link href="/hoc" className="inline-flex min-h-11 items-center rounded-xl px-3 font-bold text-ink/70 hover:bg-white">← Chọn môn khác</Link>

      {!course ? (
        <section className="mt-8 rounded-blob bg-white p-8 text-center shadow-soft">
          <h1 className="text-3xl font-extrabold">Môn này chưa có bài cho lớp {profile.grade}</h1>
          <p className="mt-2 text-ink/70">Bé quay lại sau nhé, các bài học đang được chuẩn bị!</p>
        </section>
      ) : (
        <>
          <h1 className="mt-4 text-4xl font-extrabold">{course.title}</h1>
          {course.summary && <p className="mt-1 text-lg text-ink/70">{course.summary}</p>}

          <div className="mt-8 space-y-8">
            {course.units.map((u, ui) => (
              <section key={u.slug} aria-labelledby={`u-${u.slug}`}>
                <h2 id={`u-${u.slug}`} className="text-2xl font-extrabold">
                  <span className="mr-2 inline-flex size-9 items-center justify-center rounded-full bg-brand text-lg text-white">{ui + 1}</span>
                  {u.title}
                </h2>
                {u.summary && <p className="mt-1 text-ink/70">{u.summary}</p>}
                {u.lessons.length === 0 ? (
                  <p className="mt-3 rounded-2xl bg-white/70 px-4 py-3 text-ink/60">Sắp có bài học.</p>
                ) : (
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {u.lessons.map((l) => (
                      <li key={l.slug}>
                        <Link href={`/bai-hoc/${l.slug}?mon=${subject}`}
                          className="flex min-h-24 flex-col justify-center rounded-blob bg-white p-4 shadow-soft ring-1 ring-brand/10 transition hover:-translate-y-0.5 hover:ring-brand">
                          <span className="text-xl font-extrabold">{l.title}</span>
                          <span className="mt-1 flex gap-4 text-sm text-ink/60">
                            <span className="inline-flex items-center gap-1"><Clock aria-hidden size={14} /> {l.est_minutes} phút</span>
                            <span className="inline-flex items-center gap-1"><Zap aria-hidden size={14} /> {l.xp_reward} XP</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
