"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { call } from "@/lib/client-api";
import { AVATARS, MAX_PROFILES, type Profile } from "@/lib/profiles";
import { Avatar } from "./Avatar";

type Editing = { id: string | null; display_name: string; avatar_key: string; grade: number };

export function ProfileManager({ profiles, startOpen }: { profiles: Profile[]; startOpen: boolean }) {
  const router = useRouter();
  const blank: Editing = { id: null, display_name: "", avatar_key: "fox", grade: 1 };
  const [editing, setEditing] = useState<Editing | null>(startOpen && profiles.length === 0 ? blank : null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // PIN hết hạn trong lúc thao tác → tải lại để hiện màn nhập PIN
  function handle(code: string, message: string) {
    if (code === "PIN_REQUIRED") return router.refresh();
    setError(message);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setError("");
    const body = { display_name: editing.display_name, avatar_key: editing.avatar_key, grade: editing.grade };
    const r = editing.id ? await call("PATCH", `/profiles/${editing.id}`, body) : await call("POST", "/profiles", body);
    setBusy(false);
    if (!r.ok) return handle(r.code, r.message);
    setEditing(null);
    router.refresh();
  }

  async function remove(p: Profile) {
    if (!window.confirm(`Xoá hồ sơ “${p.display_name}”? Toàn bộ tiến độ học của bé sẽ không còn.`)) return;
    const r = await call("DELETE", `/profiles/${p.id}`);
    if (!r.ok) return handle(r.code, r.message);
    router.refresh();
  }

  return (
    <div>
      {error && !editing && <p role="alert" className="mb-4 rounded-2xl bg-orange/15 p-4 font-bold text-[#8a4300]">{error}</p>}

      <ul className="grid gap-4 sm:grid-cols-2">
        {profiles.map((p) => (
          <li key={p.id} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-ink/10">
            <Avatar avatarKey={p.avatar_key} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-xl font-extrabold">{p.display_name}</p>
              <p className="text-sm text-ink/60">Lớp {p.grade} · ⭐ {p.stars} · 🔥 {p.current_streak} ngày</p>
            </div>
            <button aria-label={`Sửa hồ sơ ${p.display_name}`} onClick={() => { setError(""); setEditing({ id: p.id, display_name: p.display_name, avatar_key: p.avatar_key, grade: p.grade }); }}
              className="grid size-11 place-items-center rounded-xl text-brand hover:bg-cloud"><Pencil aria-hidden size={20} /></button>
            <button aria-label={`Xoá hồ sơ ${p.display_name}`} onClick={() => remove(p)}
              className="grid size-11 place-items-center rounded-xl text-berry hover:bg-berry/10"><Trash2 aria-hidden size={20} /></button>
          </li>
        ))}
        {profiles.length < MAX_PROFILES && (
          <li>
            <button onClick={() => { setError(""); setEditing(blank); }}
              className="flex h-full min-h-24 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-brand/30 font-display text-lg font-bold text-brand hover:bg-white">
              <Plus aria-hidden /> Thêm hồ sơ cho bé
            </button>
          </li>
        )}
      </ul>

      {editing && (
        <div role="dialog" aria-modal="true" aria-labelledby="pf-title" className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4">
          <form onSubmit={save} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-blob bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between">
              <h2 id="pf-title" className="text-2xl font-extrabold">{editing.id ? "Sửa hồ sơ" : "Hồ sơ mới"}</h2>
              <button type="button" aria-label="Đóng" onClick={() => setEditing(null)} className="grid size-10 place-items-center rounded-xl hover:bg-cloud"><X aria-hidden /></button>
            </div>

            <label className="mt-5 block font-bold" htmlFor="pf-name">Tên hoặc biệt danh của bé</label>
            <input id="pf-name" required maxLength={20} autoFocus value={editing.display_name}
              onChange={(e) => setEditing({ ...editing, display_name: e.target.value })}
              placeholder="VD: Bi, Minh Anh…"
              className="mt-1 min-h-12 w-full rounded-2xl border-2 border-ink/15 px-4 text-lg focus:border-brand focus:outline-none" />
            <p className="mt-1 text-sm text-ink/55">Không cần dùng tên thật của bé.</p>

            <label className="mt-5 block font-bold" htmlFor="pf-grade">Lớp</label>
            <select id="pf-grade" value={editing.grade} onChange={(e) => setEditing({ ...editing, grade: Number(e.target.value) })}
              className="mt-1 min-h-12 w-full rounded-2xl border-2 border-ink/15 bg-white px-4 text-lg focus:border-brand focus:outline-none">
              {Array.from({ length: 9 }, (_, i) => i + 1).map((g) => (
                <option key={g} value={g}>Lớp {g} {g <= 5 ? "· Tiểu học" : "· THCS"}</option>
              ))}
            </select>

            <fieldset className="mt-5">
              <legend className="font-bold">Chọn nhân vật</legend>
              <div className="mt-2 grid grid-cols-4 gap-3">
                {Object.entries(AVATARS).map(([key, a]) => (
                  <label key={key} className="cursor-pointer">
                    <input type="radio" name="avatar" value={key} checked={editing.avatar_key === key}
                      onChange={() => setEditing({ ...editing, avatar_key: key })} className="peer sr-only" />
                    <span className={`grid aspect-square place-items-center rounded-2xl text-4xl ring-2 ring-transparent transition peer-checked:ring-brand peer-focus-visible:ring-4 ${a.bg}`}>
                      <span role="img" aria-label={a.label}>{a.emoji}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error && <p role="alert" className="mt-4 rounded-2xl bg-orange/15 p-3 font-bold text-[#8a4300]">{error}</p>}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setEditing(null)} className="min-h-12 rounded-2xl px-5 font-bold text-ink/70 hover:bg-cloud">Huỷ</button>
              <button disabled={busy || !editing.display_name.trim()}
                className="min-h-12 rounded-2xl bg-grass px-6 font-display text-lg font-bold text-white shadow-[0_5px_0_#2a9d46] active:translate-y-1 active:shadow-[0_1px_0_#2a9d46] disabled:opacity-50">
                {busy ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
