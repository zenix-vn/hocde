import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, Empty, PageTitle, Pager, btnPrimary, inputCls, tableCls, tdCls, thCls } from "@/components/admin/ui";
import { adminGet, pageOf, qs, query, requireStaff } from "@/lib/admin";
import { fmtDate, type ProfileRow } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Học sinh" };

export default async function ProfilesPage(props: PageProps<"/admin/hoc-sinh">) {
  const sp = await props.searchParams;
  const user = await requireStaff("/admin/hoc-sinh", sp, { adminOnly: true });
  const f = { q: qs(sp, "q"), grade: qs(sp, "grade") };
  const page = pageOf(sp);
  const { data: rows, meta } = await adminGet<ProfileRow[]>(`/profiles${query({ ...f, page })}`);

  return (
    <AdminShell user={user} active="hoc-sinh">
      <PageTitle title="Học sinh" sub="Hồ sơ các bé do phụ huynh tạo (chỉ xem)" />

      <form method="get" className="mb-4 grid gap-3 sm:grid-cols-[1fr_10rem_auto]">
        <input name="q" defaultValue={f.q} placeholder="Tìm theo tên bé hoặc email phụ huynh…" aria-label="Tìm học sinh" className={inputCls} />
        <select name="grade" defaultValue={f.grade} aria-label="Lớp" className={inputCls}>
          <option value="">Mọi lớp</option>
          {Array.from({ length: 9 }, (_, i) => <option key={i + 1} value={i + 1}>Lớp {i + 1}</option>)}
        </select>
        <button className={btnPrimary}><Search aria-hidden size={18} /> Lọc</button>
      </form>

      <Card>
        {rows.length === 0 ? (
          <Empty>Chưa có hồ sơ học sinh nào.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead><tr><th className={thCls}>Tên bé</th><th className={thCls}>Lớp</th><th className={thCls}>Phụ huynh</th><th className={thCls}>XP</th><th className={thCls}>Cấp</th><th className={thCls}>Chuỗi</th><th className={thCls}>Bài xong</th><th className={thCls}>Học gần nhất</th></tr></thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-cloud/40">
                    <td className={`${tdCls} font-bold`}>{p.display_name}</td>
                    <td className={tdCls}>{p.grade}</td>
                    <td className={tdCls}><Link href={`/admin/nguoi-dung/${p.parent_id}`} className="text-brand hover:underline">{p.parent_name}</Link><span className="block text-sm text-ink/55">{p.parent_email}</span></td>
                    <td className={tdCls}>{p.total_xp}</td>
                    <td className={tdCls}>{p.level}</td>
                    <td className={tdCls}>{p.current_streak}</td>
                    <td className={tdCls}>{p.lessons_completed}</td>
                    <td className={tdCls}>{fmtDate(p.last_active_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager meta={meta} href={(p) => `/admin/hoc-sinh${query({ ...f, page: p })}`} />
      </Card>
    </AdminShell>
  );
}
