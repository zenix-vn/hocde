"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { acall } from "@/lib/admin-client";
import { slugify, type Subject } from "@/lib/admin-types";
import { Badge, btnGhost, btnPrimary, inputCls } from "./ui";

type Form = { id: number | null; name: string; slug: string; description: string; color: string; icon_key: string; sort_order: number; is_active: boolean };

const blank: Form = { id: null, name: "", slug: "", description: "", color: "#0b63d6", icon_key: "book", sort_order: 0, is_active: true };

export function SubjectManager({ subjects, canDelete }: { subjects: Subject[]; canDelete: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function open(f: Form, touched: boolean) {
    setError("");
    setSlugTouched(touched);
    setForm(f);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError("");
    const body = { name: form.name, slug: form.slug, description: form.description, color: form.color, icon_key: form.icon_key, sort_order: form.sort_order, is_active: form.is_active };
    const r = form.id ? await acall("PATCH", `/subjects/${form.id}`, body) : await acall("POST", "/subjects", body);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setForm(null);
    router.refresh();
  }

  async function remove(s: Subject) {
    if (!window.confirm(`Xoá môn “${s.name}”?`)) return;
    const r = await acall("DELETE", `/subjects/${s.id}`);
    if (!r.ok) return setError(r.message);
    router.refresh();
  }

  async function toggle(s: Subject) {
    const r = await acall("PATCH", `/subjects/${s.id}`, { is_active: !s.is_active });
    if (!r.ok) return setError(r.message);
    router.refresh();
  }

  return (
    <div>
      {error && !form && <p role="alert" className="mb-3 rounded-xl bg-orange/15 p-3 font-bold text-[#8a4300]">{error}</p>}

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {subjects.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-xl bg-white p-3 ring-1 ring-ink/10">
            <span className="size-10 shrink-0 rounded-xl" style={{ background: s.color }} aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{s.name} {!s.is_active && <Badge className="ml-1">Đang ẩn</Badge>}</p>
              <p className="text-sm text-ink/55">/{s.slug} · {s.courses} khoá học</p>
            </div>
            <button aria-label={s.is_active ? `Ẩn môn ${s.name}` : `Hiện môn ${s.name}`} onClick={() => toggle(s)} className="rounded-lg px-2 py-1 text-sm font-bold text-ink/60 hover:bg-cloud">{s.is_active ? "Ẩn" : "Hiện"}</button>
            <button aria-label={`Sửa môn ${s.name}`} onClick={() => open({ id: s.id, name: s.name, slug: s.slug, description: s.description ?? "", color: s.color, icon_key: s.icon_key, sort_order: s.sort_order, is_active: s.is_active }, true)} className="grid size-10 place-items-center rounded-xl text-brand hover:bg-cloud"><Pencil aria-hidden size={18} /></button>
            {canDelete && <button aria-label={`Xoá môn ${s.name}`} onClick={() => remove(s)} className="grid size-10 place-items-center rounded-xl text-berry hover:bg-berry/10"><Trash2 aria-hidden size={18} /></button>}
          </li>
        ))}
        <li>
          <button onClick={() => open({ ...blank, sort_order: subjects.length + 1 }, false)} className="flex h-full min-h-16 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/30 font-bold text-brand hover:bg-white">
            <Plus aria-hidden size={18} /> Thêm môn học
          </button>
        </li>
      </ul>

      {form && (
        <form onSubmit={save} className="mt-4 space-y-3 rounded-2xl bg-cloud/60 p-4 ring-1 ring-brand/20">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold">{form.id ? "Sửa môn học" : "Thêm môn học"}</h3>
            <button type="button" aria-label="Đóng" onClick={() => setForm(null)} className="grid size-10 place-items-center rounded-xl hover:bg-white"><X aria-hidden size={18} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Tên môn</span>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: slugTouched ? form.slug : slugify(e.target.value) })} className={inputCls} /></label>
            <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Đường dẫn (slug)</span>
              <input required value={form.slug} onChange={(e) => { setSlugTouched(true); setForm({ ...form, slug: e.target.value }); }} className={inputCls} /></label>
            <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-bold text-ink/60">Mô tả</span>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} /></label>
            <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Màu chủ đạo</span>
              <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-11 w-full rounded-xl bg-white p-1 ring-2 ring-ink/15" /></label>
            <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Biểu tượng (khoá)</span>
              <input value={form.icon_key} onChange={(e) => setForm({ ...form, icon_key: e.target.value })} className={inputCls} /></label>
            <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Thứ tự hiển thị</span>
              <input type="number" min={0} max={1000} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className={inputCls} /></label>
            <label className="flex min-h-11 items-center gap-2 self-end font-bold"><input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} className="size-5" /> Hiển thị cho học sinh</label>
          </div>
          {error && <p role="alert" className="rounded-xl bg-orange/15 p-3 font-bold text-[#8a4300]">{error}</p>}
          <div className="flex gap-3">
            <button disabled={busy} className={btnPrimary}>{busy ? "Đang lưu…" : "Lưu"}</button>
            <button type="button" onClick={() => setForm(null)} className={btnGhost}>Huỷ</button>
          </div>
        </form>
      )}
    </div>
  );
}
