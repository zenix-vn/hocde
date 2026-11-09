import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { UserActions } from "@/components/admin/UserActions";
import { Badge, Card, Empty, PageTitle, tableCls, tdCls, thCls } from "@/components/admin/ui";
import { adminGet, requireStaff } from "@/lib/admin";
import { ROLE_LABEL, fmtDate, fmtDateTime, type UserDetail } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Chi tiết người dùng" };

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-ink/5 py-2 last:border-0">
      <dt className="text-ink/60">{k}</dt>
      <dd className="text-right font-bold">{v}</dd>
    </div>
  );
}

export default async function UserDetailPage(props: PageProps<"/admin/nguoi-dung/[id]">) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const me = await requireStaff(`/admin/nguoi-dung/${id}`, sp, { adminOnly: true });
  const { data: d } = await adminGet<UserDetail>(`/users/${id}`);
  const u = d.user;

  return (
    <AdminShell user={me} active="nguoi-dung">
      <Link href="/admin/nguoi-dung" className="mb-2 inline-flex items-center gap-1 font-bold text-brand hover:underline"><ArrowLeft aria-hidden size={18} /> Danh sách người dùng</Link>
      <PageTitle
        title={u.full_name}
        sub={<>{u.email} {u.disabled_at && <Badge className="ml-1 bg-berry/15 text-[#a02050]">Đã khoá</Badge>}</>}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Card title="Hồ sơ của bé">
            {d.children.length === 0 ? (
              <Empty>Tài khoản này chưa tạo hồ sơ cho bé.</Empty>
            ) : (
              <div className="overflow-x-auto">
                <table className={tableCls}>
                  <thead><tr><th className={thCls}>Tên bé</th><th className={thCls}>Lớp</th><th className={thCls}>XP</th><th className={thCls}>Sao</th><th className={thCls}>Cấp</th><th className={thCls}>Chuỗi ngày</th><th className={thCls}>Bài xong</th><th className={thCls}>Học gần nhất</th></tr></thead>
                  <tbody>
                    {d.children.map((k) => (
                      <tr key={k.id}>
                        <td className={`${tdCls} font-bold`}>{k.display_name}</td>
                        <td className={tdCls}>{k.grade}</td>
                        <td className={tdCls}>{k.total_xp}</td>
                        <td className={tdCls}>{k.stars}</td>
                        <td className={tdCls}>{k.level}</td>
                        <td className={tdCls}>{k.current_streak}</td>
                        <td className={tdCls}>{k.lessons_completed}</td>
                        <td className={tdCls}>{fmtDate(k.last_active_date)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Quản lý tài khoản">
            <UserActions user={u} isSelf={u.id === me.id} sessions={d.active_sessions} />
          </Card>
        </div>

        <Card title="Thông tin">
          <dl className="text-base">
            <Row k="Vai trò" v={ROLE_LABEL[u.role] ?? u.role} />
            <Row k="Tham gia" v={fmtDateTime(u.created_at)} />
            <Row k="Đăng nhập gần nhất" v={fmtDateTime(u.last_login_at)} />
            <Row k="Liên kết Google" v={d.google_linked ? "Có" : "Không"} />
            <Row k="Đã đặt PIN phụ huynh" v={d.has_pin ? "Có" : "Chưa"} />
            <Row k="Phiên đang hoạt động" v={d.active_sessions} />
            <Row k="Đồng ý điều khoản" v={d.consent_at ? `${fmtDate(d.consent_at)} (bản ${d.consent_version ?? "?"})` : "—"} />
          </dl>
        </Card>
      </div>

      <p className="mt-6 text-sm text-ink/50">Mã tài khoản: {u.id}</p>
    </AdminShell>
  );
}
