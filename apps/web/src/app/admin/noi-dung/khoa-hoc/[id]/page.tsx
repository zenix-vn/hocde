import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { CourseEditor } from "@/components/admin/CourseEditor";
import { PageTitle } from "@/components/admin/ui";
import { adminGet, requireStaff } from "@/lib/admin";
import type { Course, UnitFull } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Khoá học" };

export default async function CoursePage(props: PageProps<"/admin/noi-dung/khoa-hoc/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const user = await requireStaff(`/admin/noi-dung/khoa-hoc/${id}`, sp);
  const { data } = await adminGet<{ course: Course; units: UnitFull[] }>(`/courses/${id}`);

  return (
    <AdminShell user={user} active="noi-dung">
      <Link href="/admin/noi-dung" className="mb-2 inline-flex items-center gap-1 font-bold text-brand hover:underline"><ArrowLeft aria-hidden size={18} /> Quản lý nội dung</Link>
      <PageTitle title={data.course.title} sub={`${data.course.subject_name} · Lớp ${data.course.grade}`} />
      <CourseEditor course={data.course} units={data.units} isAdmin={user.role === "admin"} />
    </AdminShell>
  );
}
