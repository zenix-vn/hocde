import type { Metadata } from "next";
import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { CourseCreate } from "@/components/admin/CourseCreate";
import { SubjectManager } from "@/components/admin/SubjectManager";
import { Card, Empty, PageTitle, StatusBadge, tableCls, tdCls, thCls } from "@/components/admin/ui";
import { adminGet, requireStaff } from "@/lib/admin";
import type { Course, Subject } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Nội dung" };

export default async function ContentPage(props: PageProps<"/admin/noi-dung">) {
  const sp = await props.searchParams;
  const user = await requireStaff("/admin/noi-dung", sp);
  const [{ data: subjects }, { data: courses }] = await Promise.all([
    adminGet<Subject[]>("/subjects"),
    adminGet<Course[]>("/courses"),
  ]);

  return (
    <AdminShell user={user} active="noi-dung">
      <PageTitle title="Quản lý nội dung" sub="Môn học, khoá học, chương và bài học" actions={<CourseCreate subjects={subjects} />} />

      <Card title="Khoá học">
        {courses.length === 0 ? (
          <Empty>Chưa có khoá học nào. Hãy bấm “Thêm khoá học” để bắt đầu.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead><tr><th className={thCls}>Khoá học</th><th className={thCls}>Môn</th><th className={thCls}>Lớp</th><th className={thCls}>Trạng thái</th><th className={thCls}>Chương</th><th className={thCls}>Bài (đã xuất bản)</th></tr></thead>
              <tbody>
                {courses.map((c) => (
                  <tr key={c.id} className="hover:bg-cloud/40">
                    <td className={tdCls}><Link href={`/admin/noi-dung/khoa-hoc/${c.id}`} className="font-bold text-brand hover:underline">{c.title}</Link></td>
                    <td className={tdCls}>{c.subject_name}</td>
                    <td className={tdCls}>{c.grade}</td>
                    <td className={tdCls}><StatusBadge status={c.status} /></td>
                    <td className={tdCls}>{c.units}</td>
                    <td className={tdCls}>{c.lessons} ({c.published_lessons})</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Môn học" className="mt-6">
        <SubjectManager subjects={subjects} canDelete={user.role === "admin"} />
      </Card>

      <p className="mt-6 text-sm text-ink/55">
        Lưu ý: lệnh <code>make content-import</code> nhập từ thư mục <code>content/</code> sẽ ghi đè các bài trùng slug. Hãy chọn một nguồn soạn thảo chính để tránh mất chỉnh sửa.
      </p>
    </AdminShell>
  );
}
