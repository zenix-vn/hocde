"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowDown, ArrowUp, Copy, FilePlus2, FolderPlus, Pencil, Trash2 } from "lucide-react";
import { acall } from "@/lib/admin-client";
import { STATUS_LABEL, fmtDate, slugify, type Course, type UnitFull } from "@/lib/admin-types";
import { StatusBadge, btnDanger, btnGhost, btnPrimary, inputCls } from "./ui";

export function CourseEditor({ course, units, isAdmin }: { course: Course; units: UnitFull[]; isAdmin: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // thông tin khoá học
  const [title, setTitle] = useState(course.title);
  const [slug, setSlug] = useState(course.slug);
  const [summary, setSummary] = useState(course.summary ?? "");
  const [status, setStatus] = useState(course.status);
  const [saved, setSaved] = useState(false);

  // form thêm/sửa chương, thêm bài
  const [unitForm, setUnitForm] = useState<{ id: string | null; title: string; slug: string; summary: string } | null>(null);
  const [lessonForm, setLessonForm] = useState<{ unitId: string; title: string; slug: string } | null>(null);

  async function act(fn: () => ReturnType<typeof acall>, after?: () => void) {
    setBusy(true);
    setError("");
    const r = await fn();
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return false;
    }
    if (after) after();
    else router.refresh();
    return true;
  }

  async function saveCourse(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    await act(() => acall("PATCH", `/courses/${course.id}`, { title, slug, summary, status }), () => {
      setSaved(true);
      router.refresh();
    });
  }

  async function deleteCourse() {
    if (!window.confirm(`XOÁ khoá học “${course.title}” cùng ${course.units} chương và ${course.lessons} bài học? Tiến độ học liên quan cũng mất.`)) return;
    await act(() => acall("DELETE", `/courses/${course.id}`), () => router.replace("/admin/noi-dung"));
  }

  async function saveUnit(e: FormEvent) {
    e.preventDefault();
    if (!unitForm) return;
    const body = { title: unitForm.title, slug: unitForm.slug, summary: unitForm.summary };
    const ok = await act(() => (unitForm.id ? acall("PATCH", `/units/${unitForm.id}`, body) : acall("POST", `/courses/${course.id}/units`, body)));
    if (ok) setUnitForm(null);
  }

  async function deleteUnit(u: UnitFull) {
    if (!window.confirm(`XOÁ chương “${u.title}” cùng ${u.lessons.length} bài học bên trong?`)) return;
    await act(() => acall("DELETE", `/units/${u.id}`));
  }

  async function addLesson(e: FormEvent) {
    e.preventDefault();
    if (!lessonForm) return;
    const r = await acall<{ id: string }>("POST", `/units/${lessonForm.unitId}/lessons`, { title: lessonForm.title, slug: lessonForm.slug });
    if (!r.ok) return setError(r.message);
    router.push(`/admin/noi-dung/bai-hoc/${r.data.id}`);
  }

  function move<T extends { id: string }>(list: T[], i: number, dir: -1 | 1): string[] {
    const ids = list.map((x) => x.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    return ids;
  }

  async function deleteLesson(id: string, t: string) {
    if (!window.confirm(`XOÁ bài “${t}”? Không thể khôi phục.`)) return;
    await act(() => acall("DELETE", `/lessons/${id}`));
  }

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="rounded-xl bg-orange/15 p-3 font-bold text-[#8a4300]">{error}</p>}

      <form onSubmit={saveCourse} className="grid gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink/10 sm:grid-cols-2">
        <h2 className="text-xl font-extrabold sm:col-span-2">Thông tin khoá học</h2>
        <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Tiêu đề</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} /></label>
        <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Đường dẫn (slug)</span>
          <input required value={slug} onChange={(e) => setSlug(e.target.value)} className={inputCls} /></label>
        <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-bold text-ink/60">Tóm tắt</span>
          <input value={summary} onChange={(e) => setSummary(e.target.value)} className={inputCls} /></label>
        <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Trạng thái</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
        <div className="flex flex-wrap items-end gap-3">
          <button disabled={busy} className={btnPrimary}>Lưu khoá học</button>
          {isAdmin && <button type="button" disabled={busy} onClick={deleteCourse} className={btnDanger}><Trash2 aria-hidden size={18} /> Xoá</button>}
          {saved && <span role="status" className="font-bold text-[#17692c]">Đã lưu ✓</span>}
        </div>
      </form>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold">Chương & bài học</h2>
        <button className={btnPrimary} onClick={() => setUnitForm({ id: null, title: "", slug: "", summary: "" })}><FolderPlus aria-hidden size={18} /> Thêm chương</button>
      </div>

      {unitForm && (
        <form onSubmit={saveUnit} className="space-y-3 rounded-2xl bg-cloud/60 p-4 ring-1 ring-brand/20">
          <h3 className="text-lg font-extrabold">{unitForm.id ? "Sửa chương" : "Thêm chương"}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Tiêu đề chương</span>
              <input required value={unitForm.title} onChange={(e) => setUnitForm({ ...unitForm, title: e.target.value, slug: unitForm.id ? unitForm.slug : slugify(e.target.value) })} className={inputCls} /></label>
            <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Đường dẫn (slug)</span>
              <input required value={unitForm.slug} onChange={(e) => setUnitForm({ ...unitForm, slug: e.target.value })} className={inputCls} /></label>
            <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-bold text-ink/60">Mô tả</span>
              <input value={unitForm.summary} onChange={(e) => setUnitForm({ ...unitForm, summary: e.target.value })} className={inputCls} /></label>
          </div>
          <div className="flex gap-3"><button disabled={busy} className={btnPrimary}>Lưu chương</button><button type="button" onClick={() => setUnitForm(null)} className={btnGhost}>Huỷ</button></div>
        </form>
      )}

      {units.length === 0 && <p className="rounded-xl bg-cloud/60 p-6 text-center text-ink/60">Khoá học chưa có chương nào.</p>}

      {units.map((u, ui) => (
        <section key={u.id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink/10">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 flex-1 text-xl font-extrabold"><span className="text-ink/45">Chương {ui + 1}.</span> {u.title}</h3>
            <button aria-label="Chuyển chương lên" disabled={busy || ui === 0} onClick={() => act(() => acall("POST", `/courses/${course.id}/units/reorder`, { ids: move(units, ui, -1) }))} className="grid size-10 place-items-center rounded-xl hover:bg-cloud disabled:opacity-30"><ArrowUp aria-hidden size={18} /></button>
            <button aria-label="Chuyển chương xuống" disabled={busy || ui === units.length - 1} onClick={() => act(() => acall("POST", `/courses/${course.id}/units/reorder`, { ids: move(units, ui, 1) }))} className="grid size-10 place-items-center rounded-xl hover:bg-cloud disabled:opacity-30"><ArrowDown aria-hidden size={18} /></button>
            <button aria-label="Sửa chương" onClick={() => setUnitForm({ id: u.id, title: u.title, slug: u.slug, summary: u.summary ?? "" })} className="grid size-10 place-items-center rounded-xl text-brand hover:bg-cloud"><Pencil aria-hidden size={18} /></button>
            {isAdmin && <button aria-label="Xoá chương" onClick={() => deleteUnit(u)} className="grid size-10 place-items-center rounded-xl text-berry hover:bg-berry/10"><Trash2 aria-hidden size={18} /></button>}
          </div>
          {u.summary && <p className="text-base text-ink/60">{u.summary}</p>}

          <ul className="mt-3 divide-y divide-ink/5">
            {u.lessons.map((l, li) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2 py-2">
                <span className="w-7 text-center text-sm font-bold text-ink/45">{li + 1}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/noi-dung/bai-hoc/${l.id}`} className="font-bold text-brand hover:underline">{l.title}</Link>
                  <p className="text-sm text-ink/55">{l.exercises} bài tập · {l.est_minutes} phút · {l.xp_reward} XP · v{l.version} · sửa {fmtDate(l.updated_at)}</p>
                </div>
                <StatusBadge status={l.status} />
                <button aria-label="Chuyển bài lên" disabled={busy || li === 0} onClick={() => act(() => acall("POST", `/units/${u.id}/lessons/reorder`, { ids: move(u.lessons, li, -1) }))} className="grid size-10 place-items-center rounded-xl hover:bg-cloud disabled:opacity-30"><ArrowUp aria-hidden size={18} /></button>
                <button aria-label="Chuyển bài xuống" disabled={busy || li === u.lessons.length - 1} onClick={() => act(() => acall("POST", `/units/${u.id}/lessons/reorder`, { ids: move(u.lessons, li, 1) }))} className="grid size-10 place-items-center rounded-xl hover:bg-cloud disabled:opacity-30"><ArrowDown aria-hidden size={18} /></button>
                <button aria-label="Nhân bản bài" disabled={busy} onClick={() => act(() => acall("POST", `/lessons/${l.id}/duplicate`))} className="grid size-10 place-items-center rounded-xl text-brand hover:bg-cloud"><Copy aria-hidden size={18} /></button>
                {isAdmin && <button aria-label="Xoá bài" disabled={busy} onClick={() => deleteLesson(l.id, l.title)} className="grid size-10 place-items-center rounded-xl text-berry hover:bg-berry/10"><Trash2 aria-hidden size={18} /></button>}
              </li>
            ))}
          </ul>

          {lessonForm?.unitId === u.id ? (
            <form onSubmit={addLesson} className="mt-3 grid gap-3 rounded-xl bg-cloud/60 p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
              <input required autoFocus placeholder="Tiêu đề bài học" aria-label="Tiêu đề bài học" value={lessonForm.title} onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value, slug: slugify(e.target.value) })} className={inputCls} />
              <input required placeholder="duong-dan-bai-hoc" aria-label="Đường dẫn bài học" value={lessonForm.slug} onChange={(e) => setLessonForm({ ...lessonForm, slug: e.target.value })} className={inputCls} />
              <button className={btnPrimary}>Tạo & soạn</button>
              <button type="button" onClick={() => setLessonForm(null)} className={btnGhost}>Huỷ</button>
            </form>
          ) : (
            <button onClick={() => setLessonForm({ unitId: u.id, title: "", slug: "" })} className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-bold text-brand hover:bg-cloud"><FilePlus2 aria-hidden size={18} /> Thêm bài học</button>
          )}
        </section>
      ))}
    </div>
  );
}
