import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Badge, Card, Empty, PageTitle, Pager, btnPrimary, inputCls, tableCls, tdCls, thCls } from "@/components/admin/ui";
import { adminGet, pageOf, qs, query, requireStaff } from "@/lib/admin";
import { ROLE_LABEL, fmtDate, type UserRow } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Người dùng" };

export default async function UsersPage(props: PageProps<"/admin/nguoi-dung">) {
  const sp = await props.searchParams;
  const user = await requireStaff("/admin/nguoi-dung", sp, { adminOnly: true });
  const f = { q: qs(sp, "q"), role: qs(sp, "role"), status: qs(sp, "status") };
  const page = pageOf(sp);
  const { data: rows, meta } = await adminGet<UserRow[]>(`/users${query({ ...f, page })}`);

  return (
    <AdminShell user={user} active="nguoi-dung">
      <PageTitle title="Người dùng" sub="Tài khoản phụ huynh, giáo viên và đội ngũ quản trị" />

      <form method="get" className="mb-4 grid gap-3 sm:grid-cols-[1fr_11rem_10rem_auto]">
        <input name="q" defaultValue={f.q} placeholder="Tìm theo tên hoặc email…" aria-label="Tìm người dùng" className={inputCls} />
        <select name="role" defaultValue={f.role} aria-label="Vai trò" className={inputCls}>
          <option value="">Mọi vai trò</option>
          {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select name="status" defaultValue={f.status} aria-label="Trạng thái" className={inputCls}>
          <option value="">Mọi trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="disabled">Đã khoá</option>
        </select>
        <button className={btnPrimary}><Search aria-hidden size={18} /> Lọc</button>
      </form>

      <Card>
        {rows.length === 0 ? (
          <Empty>Không có người dùng nào khớp bộ lọc.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr><th className={thCls}>Tên</th><th className={thCls}>Email</th><th className={thCls}>Vai trò</th><th className={thCls}>Số bé</th><th className={thCls}>Tham gia</th><th className={thCls}>Đăng nhập gần nhất</th></tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="hover:bg-cloud/40">
                    <td className={tdCls}>
                      <Link href={`/admin/nguoi-dung/${u.id}`} className="font-bold text-brand hover:underline">{u.full_name}</Link>
                      {u.disabled_at && <Badge className="ml-2 bg-berry/15 text-[#a02050]">Đã khoá</Badge>}
                    </td>
                    <td className={tdCls}>{u.email}</td>
                    <td className={tdCls}><Badge className={u.role === "admin" ? "bg-grape/20 text-[#4b34b0]" : u.role === "editor" ? "bg-sky/25 text-[#0a5a73]" : undefined}>{ROLE_LABEL[u.role] ?? u.role}</Badge></td>
                    <td className={tdCls}>{u.profiles}</td>
                    <td className={tdCls}>{fmtDate(u.created_at)}</td>
                    <td className={tdCls}>{fmtDate(u.last_login_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager meta={meta} href={(p) => `/admin/nguoi-dung${query({ ...f, page: p })}`} />
      </Card>
    </AdminShell>
  );
}
