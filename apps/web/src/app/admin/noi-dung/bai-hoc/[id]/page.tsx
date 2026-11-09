import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { LessonEditor } from "@/components/admin/LessonEditor";
import { PageTitle } from "@/components/admin/ui";
import { adminGet, requireStaff } from "@/lib/admin";
import type { LessonFull } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Soạn bài học" };

export default async function LessonEditPage(props: PageProps<"/admin/noi-dung/bai-hoc/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const user = await requireStaff(`/admin/noi-dung/bai-hoc/${id}`, sp);
  const { data } = await adminGet<{ lesson: LessonFull; units: { id: string; title: string }[] }>(`/lessons/${id}`);
  const l = data.lesson;

  return (
    <AdminShell user={user} active="noi-dung">
      <Link href={`/admin/noi-dung/khoa-hoc/${l.course_id}`} className="mb-2 inline-flex items-center gap-1 font-bold text-brand hover:underline"><ArrowLeft aria-hidden size={18} /> {l.course_title}</Link>
      <PageTitle title={l.title} sub={`Chương: ${l.unit_title}`} />
      {/* key theo id: trạng thái soạn không bị reset khi trang làm mới sau lưu */}
      <LessonEditor key={l.id} lesson={l} units={data.units} isAdmin={user.role === "admin"} />
    </AdminShell>
  );
}
