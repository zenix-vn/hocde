"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { acall } from "@/lib/admin-client";
import { slugify, type Subject } from "@/lib/admin-types";
import { btnGhost, btnPrimary, inputCls } from "./ui";

export function CourseCreate({ subjects }: { subjects: Subject[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? 0);
  const [grade, setGrade] = useState(1);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [touched, setTouched] = useState(false);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!open) {
    return <button onClick={() => setOpen(true)} disabled={subjects.length === 0} className={btnPrimary}><Plus aria-hidden size={18} /> Thêm khoá học</button>;
  }

  const suggest = (sId: number, g: number) => {
    const s = subjects.find((x) => x.id === sId);
    return slugify(`${s?.slug ?? ""}-lop-${g}`);
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await acall<{ id: string }>("POST", "/courses", { subject_id: subjectId, grade, title, slug, summary });
    setBusy(false);
    if (!r.ok) return setError(r.message);
    router.push(`/admin/noi-dung/khoa-hoc/${r.data.id}`);
  }

  return (
    <form onSubmit={submit} className="w-full space-y-3 rounded-2xl bg-cloud/60 p-4 ring-1 ring-brand/20">
      <h3 className="text-lg font-extrabold">Thêm khoá học</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Môn học</span>
          <select value={subjectId} onChange={(e) => { const v = Number(e.target.value); setSubjectId(v); if (!touched) setSlug(suggest(v, grade)); }} className={inputCls}>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></label>
        <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Lớp</span>
          <select value={grade} onChange={(e) => { const v = Number(e.target.value); setGrade(v); if (!touched) setSlug(suggest(subjectId, v)); }} className={inputCls}>
            {Array.from({ length: 9 }, (_, i) => <option key={i + 1} value={i + 1}>Lớp {i + 1}</option>)}
          </select></label>
        <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Tiêu đề</span>
          <input required value={title} onChange={(e) => { setTitle(e.target.value); if (!touched) setSlug(suggest(subjectId, grade)); }} placeholder="VD: Tiếng Việt lớp 1" className={inputCls} /></label>
        <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Đường dẫn (slug)</span>
          <input required value={slug} onChange={(e) => { setTouched(true); setSlug(e.target.value); }} className={inputCls} /></label>
        <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-bold text-ink/60">Tóm tắt</span>
          <input value={summary} onChange={(e) => setSummary(e.target.value)} className={inputCls} /></label>
      </div>
      {error && <p role="alert" className="rounded-xl bg-orange/15 p-3 font-bold text-[#8a4300]">{error}</p>}
      <div className="flex gap-3">
        <button disabled={busy} className={btnPrimary}>{busy ? "Đang tạo…" : "Tạo khoá học"}</button>
        <button type="button" onClick={() => setOpen(false)} className={btnGhost}>Huỷ</button>
      </div>
    </form>
  );
}
