import type { Metadata } from "next";
import { Search } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, Empty, PageTitle, Pager, btnPrimary, inputCls, tableCls, tdCls, thCls } from "@/components/admin/ui";
import { adminGet, pageOf, qs, query, requireStaff } from "@/lib/admin";
import { fmtDateTime, type AuditRow } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Nhật ký" };

const ACTIONS: Record<string, string> = {
  "user.update": "Sửa người dùng",
  "user.delete": "Xoá người dùng",
  "user.revoke_sessions": "Đăng xuất mọi thiết bị",
  "user.bootstrap_admin": "Cấp admin (ADMIN_EMAILS)",
  "subject.create": "Tạo môn học",
  "subject.update": "Sửa môn học",
  "subject.delete": "Xoá môn học",
  "course.create": "Tạo khoá học",
  "course.update": "Sửa khoá học",
  "course.delete": "Xoá khoá học",
  "unit.create": "Tạo chương",
  "unit.update": "Sửa chương",
  "unit.delete": "Xoá chương",
  "unit.reorder": "Sắp xếp chương",
  "lesson.create": "Tạo bài học",
  "lesson.update": "Sửa thông tin bài",
  "lesson.save_content": "Lưu nội dung bài",
  "lesson.status": "Đổi trạng thái bài",
  "lesson.duplicate": "Nhân bản bài",
  "lesson.delete": "Xoá bài học",
  "lesson.reorder": "Sắp xếp bài",
};

export default async function AuditPage(props: PageProps<"/admin/nhat-ky">) {
  const sp = await props.searchParams;
  const user = await requireStaff("/admin/nhat-ky", sp, { adminOnly: true });
  const f = { action: qs(sp, "action") };
  const page = pageOf(sp);
  const { data: rows, meta } = await adminGet<AuditRow[]>(`/audit${query({ ...f, page })}`);

  return (
    <AdminShell user={user} active="nhat-ky">
      <PageTitle title="Nhật ký thao tác" sub="Mọi thay đổi quan trọng của đội ngũ quản trị được ghi lại tại đây" />

      <form method="get" className="mb-4 grid gap-3 sm:grid-cols-[16rem_auto]">
        <select name="action" defaultValue={f.action} aria-label="Nhóm thao tác" className={inputCls}>
          <option value="">Mọi thao tác</option>
          {["user", "subject", "course", "unit", "lesson"].map((k) => <option key={k} value={`${k}.`}>{{ user: "Người dùng", subject: "Môn học", course: "Khoá học", unit: "Chương", lesson: "Bài học" }[k]}</option>)}
        </select>
        <button className={btnPrimary}><Search aria-hidden size={18} /> Lọc</button>
      </form>

      <Card>
        {rows.length === 0 ? (
          <Empty>Chưa có thao tác nào được ghi lại.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead><tr><th className={thCls}>Thời gian</th><th className={thCls}>Người thực hiện</th><th className={thCls}>Thao tác</th><th className={thCls}>Đối tượng</th><th className={thCls}>Chi tiết</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className={`${tdCls} whitespace-nowrap`}>{fmtDateTime(r.created_at)}</td>
                    <td className={tdCls}>{r.actor_email ?? <span className="text-ink/45">(đã xoá)</span>}</td>
                    <td className={tdCls}><b>{ACTIONS[r.action] ?? r.action}</b></td>
                    <td className={`${tdCls} text-sm text-ink/60`}>{r.entity}<span className="block max-w-[11rem] truncate" title={r.entity_id ?? ""}>{r.entity_id}</span></td>
                    <td className={`${tdCls} max-w-xs break-words font-mono text-xs text-ink/60`}>{r.meta ? JSON.stringify(r.meta) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager meta={meta} href={(p) => `/admin/nhat-ky${query({ ...f, page: p })}`} />
      </Card>
    </AdminShell>
  );
}
