import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LessonPlayer } from "@/components/lesson/LessonPlayer";
import { getActiveProfile, requireUser } from "@/lib/auth";
import { getLesson } from "@/lib/learn";

export const metadata: Metadata = { title: "Bài học", robots: { index: false, follow: false } };

export default async function LessonPage(props: PageProps<"/bai-hoc/[slug]">) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  await requireUser(`/bai-hoc/${slug}`, sp.renewed === "1");
  if (!(await getActiveProfile())) redirect("/chon-ho-so");

  const lesson = await getLesson(slug);
  if (!lesson) notFound();

  const from = typeof sp.mon === "string" && /^[a-z0-9-]+$/.test(sp.mon) ? sp.mon : "tieng-viet";
  return <LessonPlayer slug={lesson.slug} title={lesson.title} xp={lesson.xp_reward} blocks={lesson.blocks} backHref={`/hoc/${from}`} />;
}
