import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, Empty, PageTitle, Stat } from "@/components/admin/ui";
import { adminGet, requireStaff } from "@/lib/admin";
import type { Stats } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Tổng quan" };

function Bars({ label, values, days, color }: { label: string; values: number[]; days: string[]; color: string }) {
  const max = Math.max(1, ...values);
  const total = values.reduce((a, b) => a + b, 0);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <p className="font-bold">{label}</p>
        <p className="text-sm text-ink/60">14 ngày: <b className="text-ink">{total}</b></p>
      </div>
      <div className="flex h-24 items-end gap-1" role="img" aria-label={`${label}: ${values.join(", ")}`}>
        {values.map((v, i) => (
          <div key={days[i]} className="group flex h-full flex-1 flex-col justify-end" title={`${days[i].slice(5).replace("-", "/")}: ${v}`}>
            <div className={`${color} min-h-px rounded-t`} style={{ height: `${(v / max) * 100}%`, opacity: v === 0 ? 0.25 : 1 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-xs text-ink/50">
        <span>{days[0].slice(5).replace("-", "/")}</span>
        <span>{days[days.length - 1].slice(5).replace("-", "/")}</span>
      </div>
    </div>
  );
}

export default async function AdminHome(props: PageProps<"/admin">) {
  const sp = await props.searchParams;
  const user = await requireStaff("/admin", sp);
  if (user.role !== "admin") redirect("/admin/noi-dung");
  const { data: s } = await adminGet<Stats>("/stats");
  const days = s.series.map((p) => p.day);
  const pct = (n: number | null) => (n === null ? "—" : `${Math.round(n * 100)}%`);

  return (
    <AdminShell user={user} active="tong-quan">
      <PageTitle title="Tổng quan" sub="Số liệu hoạt động của hocde.vn" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Tài khoản phụ huynh" value={s.users.parents} hint={`+${s.users.new_7d} trong 7 ngày · +${s.users.new_30d} trong 30 ngày`} />
        <Stat label="Hồ sơ học sinh" value={s.users.profiles} hint={`${s.users.active_profiles_7d} bé học trong 7 ngày`} tone="grass" />
        <Stat label="Bài học đã xuất bản" value={`${s.content.published_lessons}/${s.content.lessons}`} hint={`${s.content.draft_lessons} nháp · ${s.content.review_lessons} chờ duyệt`} tone="orange" />
        <Stat label="Bài tập" value={s.content.exercises} hint={`${s.content.published_courses}/${s.content.courses} khoá học đã xuất bản`} tone="grape" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Lượt làm bài (7 ngày)" value={s.learning.attempts_7d} />
        <Stat label="Tỉ lệ đúng (7 ngày)" value={pct(s.learning.accuracy_7d)} tone="grass" />
        <Stat label="Bài hoàn thành (7 ngày)" value={s.learning.completions_7d} tone="orange" />
        <Stat label="Thời gian học (7 ngày)" value={`${s.learning.minutes_7d} phút`} tone="grape" />
      </div>

      <Card title="Hoạt động 14 ngày qua" className="mt-6">
        <div className="grid gap-6 md:grid-cols-3">
          <Bars label="Tài khoản mới" values={s.series.map((p) => p.signups)} days={days} color="bg-brand" />
          <Bars label="Bài hoàn thành" values={s.series.map((p) => p.completions)} days={days} color="bg-grass" />
          <Bars label="Lượt làm bài tập" values={s.series.map((p) => p.attempts)} days={days} color="bg-orange" />
        </div>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Bài được học nhiều nhất">
          {s.top_lessons.length === 0 ? (
            <Empty>Chưa có bài nào được hoàn thành.</Empty>
          ) : (
            <ol className="space-y-2">
              {s.top_lessons.map((l, i) => (
                <li key={l.id} className="flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-full bg-cloud text-sm font-bold">{i + 1}</span>
                  <Link href={`/admin/noi-dung/bai-hoc/${l.id}`} className="min-w-0 flex-1 truncate font-bold text-brand hover:underline">{l.title}</Link>
                  <span className="text-ink/60">{l.count} lượt</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card title="Bài khó nhất (tỉ lệ đúng thấp)">
          {s.hardest_lessons.length === 0 ? (
            <Empty>Cần ít nhất 5 lượt làm bài để thống kê.</Empty>
          ) : (
            <ol className="space-y-2">
              {s.hardest_lessons.map((l, i) => (
                <li key={l.id} className="flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-full bg-berry/15 text-sm font-bold">{i + 1}</span>
                  <Link href={`/admin/noi-dung/bai-hoc/${l.id}`} className="min-w-0 flex-1 truncate font-bold text-brand hover:underline">{l.title}</Link>
                  <span className="text-ink/60">đúng {Math.round(l.rate * 100)}% · {l.count} lượt</span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      {s.users.disabled > 0 && (
        <p className="mt-6 text-base text-ink/65">
          Có <b>{s.users.disabled}</b> tài khoản đang bị khoá. <Link className="font-bold text-brand hover:underline" href="/admin/nguoi-dung?status=disabled">Xem danh sách</Link>
        </p>
      )}
    </AdminShell>
  );
}
