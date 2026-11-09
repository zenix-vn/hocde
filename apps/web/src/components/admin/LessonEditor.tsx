"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowUp, Check, Code2, Copy, Eye, Plus, Save, Trash2 } from "lucide-react";
import { acall } from "@/lib/admin-client";
import { STATUS_LABEL, fmtDateTime, slugify, type Block, type LessonFull } from "@/lib/admin-types";
import { BLOCK_KINDS, TYPE_LABEL, nextBlockId } from "./blockTemplates";
import { StatusBadge, btnGhost, btnPrimary, inputCls } from "./ui";

type Item = { uid: number; block: Block };
type Unit = { id: string; title: string };

// uid chỉ cần duy nhất trong phiên trình duyệt (dùng làm key React cho khối)
let uidSeq = 0;
const mk = (b: Block): Item => ({ uid: ++uidSeq, block: b });

const FORM_TYPES = new Set(["mascot_say", "text", "callout", "summary"]);

/* ---------- một khối nội dung ---------- */

function BlockCard(props: {
  index: number;
  total: number;
  block: Block;
  onChange: (b: Block) => void;
  onMove: (dir: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const { block, index, total } = props;
  const [json, setJson] = useState<string | null>(FORM_TYPES.has(block.type) ? null : JSON.stringify(block, null, 2));
  const [jsonErr, setJsonErr] = useState("");

  function toggleMode() {
    if (json === null) setJson(JSON.stringify(block, null, 2));
    else {
      setJson(null);
      setJsonErr("");
    }
  }

  function onJson(text: string) {
    setJson(text);
    try {
      const v = JSON.parse(text);
      if (!v || typeof v !== "object" || Array.isArray(v)) throw new Error("Khối phải là một đối tượng JSON");
      if (typeof v.id !== "string" || typeof v.type !== "string") throw new Error("Thiếu “id” hoặc “type”");
      setJsonErr("");
      props.onChange(v as Block);
    } catch (e) {
      setJsonErr(e instanceof Error ? e.message : "JSON không hợp lệ");
    }
  }

  const str = (k: string) => (typeof block[k] === "string" ? (block[k] as string) : "");
  const set = (k: string, v: string) => props.onChange({ ...block, [k]: v });
  const kindLabel = block.type === "exercise" ? `Bài tập · ${str("kind")}` : block.type === "interactive" ? `Tương tác · ${str("kind")}` : (TYPE_LABEL[block.type] ?? block.type);

  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-ink/10">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="grid size-7 place-items-center rounded-full bg-cloud text-sm font-bold">{index + 1}</span>
        <span className="font-bold">{kindLabel}</span>
        <code className="rounded bg-ink/5 px-1.5 text-sm text-ink/60">{block.id}</code>
        <span className="flex-1" />
        <button type="button" aria-label="Chuyển khối lên" disabled={index === 0} onClick={() => props.onMove(-1)} className="grid size-9 place-items-center rounded-lg hover:bg-cloud disabled:opacity-30"><ArrowUp aria-hidden size={16} /></button>
        <button type="button" aria-label="Chuyển khối xuống" disabled={index === total - 1} onClick={() => props.onMove(1)} className="grid size-9 place-items-center rounded-lg hover:bg-cloud disabled:opacity-30"><ArrowDown aria-hidden size={16} /></button>
        {FORM_TYPES.has(block.type) && (
          <button type="button" aria-pressed={json !== null} aria-label="Sửa dạng JSON" title="Sửa dạng JSON" onClick={toggleMode} className={`grid size-9 place-items-center rounded-lg hover:bg-cloud ${json !== null ? "bg-cloud text-brand" : ""}`}><Code2 aria-hidden size={16} /></button>
        )}
        <button type="button" aria-label="Nhân bản khối" onClick={props.onDuplicate} className="grid size-9 place-items-center rounded-lg text-brand hover:bg-cloud"><Copy aria-hidden size={16} /></button>
        <button type="button" aria-label="Xoá khối" onClick={props.onRemove} className="grid size-9 place-items-center rounded-lg text-berry hover:bg-berry/10"><Trash2 aria-hidden size={16} /></button>
      </div>

      {json !== null ? (
        <>
          <textarea
            value={json}
            onChange={(e) => onJson(e.target.value)}
            spellCheck={false}
            aria-label={`JSON của khối ${block.id}`}
            aria-invalid={!!jsonErr}
            rows={Math.min(24, Math.max(6, json.split("\n").length + 1))}
            className={`w-full rounded-xl bg-ink/[0.03] p-3 font-mono text-sm leading-relaxed ring-2 focus:ring-brand ${jsonErr ? "ring-berry/60" : "ring-ink/10"}`}
          />
          {jsonErr && <p role="alert" className="mt-1 text-sm font-bold text-[#a02050]">JSON chưa hợp lệ (chưa áp dụng): {jsonErr}</p>}
        </>
      ) : block.type === "mascot_say" ? (
        <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Lời linh vật</span>
          <textarea value={str("text")} onChange={(e) => set("text", e.target.value)} rows={2} className={`${inputCls} py-2`} /></label>
      ) : (
        <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Nội dung (Markdown)</span>
          <textarea value={str("markdown")} onChange={(e) => set("markdown", e.target.value)} rows={5} className={`${inputCls} py-2 font-mono text-sm`} /></label>
      )}
    </div>
  );
}

/* ---------- trình soạn bài ---------- */

export function LessonEditor({ lesson, units, isAdmin }: { lesson: LessonFull; units: Unit[]; isAdmin: boolean }) {
  const router = useRouter();
  // Khởi tạo một lần; sau khi lưu/xuất bản, trang giữ nguyên trạng thái soạn và chỉ cập nhật version.
  const [items, setItems] = useState<Item[]>(() => lesson.content.blocks.map(mk));
  const [version, setVersion] = useState(lesson.version);
  const [dirty, setDirty] = useState(false);
  const [problems, setProblems] = useState<string[]>(lesson.problems);
  const [status, setStatus] = useState(lesson.status);
  const [addKind, setAddKind] = useState(BLOCK_KINDS[0].key);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // thông tin bài
  const [meta, setMeta] = useState({
    title: lesson.title, slug: lesson.slug, summary: lesson.summary ?? "",
    est_minutes: lesson.est_minutes, xp_reward: lesson.xp_reward, unit_id: lesson.unit_id,
  });
  const [metaDirty, setMetaDirty] = useState(false);

  // cảnh báo khi rời trang với thay đổi chưa lưu
  useEffect(() => {
    if (!dirty && !metaDirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty, metaDirty]);

  const blocks = items.map((i) => i.block);
  const dupIds = blocks.filter((b, i) => blocks.findIndex((x) => x.id === b.id) !== i).map((b) => b.id);

  function update(fn: (list: Item[]) => Item[]) {
    setItems(fn);
    setDirty(true);
    setMsg(null);
  }

  async function saveContent(): Promise<boolean> {
    if (dupIds.length) {
      setMsg({ ok: false, text: `Có id khối bị trùng: ${[...new Set(dupIds)].join(", ")}` });
      return false;
    }
    setBusy(true);
    setMsg(null);
    const r = await acall<{ version: number; problems: string[] }>("PUT", `/lessons/${lesson.id}/content`, { blocks, version });
    setBusy(false);
    if (!r.ok) {
      setMsg({ ok: false, text: r.message });
      return false;
    }
    setVersion(r.data.version);
    setProblems(r.data.problems);
    setDirty(false);
    setMsg({ ok: true, text: r.data.problems.length ? `Đã lưu (còn ${r.data.problems.length} điểm cần sửa trước khi xuất bản).` : "Đã lưu nội dung." });
    return true;
  }

  async function saveMeta(): Promise<boolean> {
    setBusy(true);
    setMsg(null);
    const r = await acall("PATCH", `/lessons/${lesson.id}`, meta);
    setBusy(false);
    if (!r.ok) {
      setMsg({ ok: false, text: r.message });
      return false;
    }
    setMetaDirty(false);
    setMsg({ ok: true, text: "Đã lưu thông tin bài." });
    router.refresh();
    return true;
  }

  async function saveAll() {
    if (metaDirty && !(await saveMeta())) return;
    if (dirty) await saveContent();
  }

  async function changeStatus(next: string) {
    if (dirty || metaDirty) {
      if (!window.confirm("Bạn có thay đổi chưa lưu. Lưu rồi mới đổi trạng thái?")) return;
      await saveAll();
    }
    setBusy(true);
    const r = await acall("POST", `/lessons/${lesson.id}/status`, { status: next });
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setStatus(next);
    setMsg({ ok: true, text: `Đã chuyển sang “${STATUS_LABEL[next]}”.` });
    router.refresh();
  }

  function add() {
    const kind = BLOCK_KINDS.find((k) => k.key === addKind)!;
    update((l) => {
      const block = kind.make(nextBlockId(l.map((i) => i.block)));
      // khối "tổng kết" luôn đặt cuối; các khối khác chèn trước khối tổng kết hiện có
      const lastIsSummary = l.length > 0 && l[l.length - 1].block.type === "summary";
      if (block.type !== "summary" && lastIsSummary) return [...l.slice(0, -1), mk(block), l[l.length - 1]];
      return [...l, mk(block)];
    });
  }

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 -mx-4 flex flex-wrap items-center gap-3 border-b border-ink/10 bg-white/95 px-4 py-3 backdrop-blur lg:-mx-8 lg:px-8">
        <StatusBadge status={status} />
        <span className="text-sm text-ink/55">v{version} · cập nhật {fmtDateTime(lesson.updated_at)}</span>
        {(dirty || metaDirty) && <span className="text-sm font-bold text-[#8a4300]">● Chưa lưu</span>}
        <span className="flex-1" />
        <Link href={`/bai-hoc/${lesson.slug}?mon=${lesson.subject_slug}`} target="_blank" className={btnGhost}><Eye aria-hidden size={18} /> Xem thử</Link>
        {status === "published" ? (
          <button disabled={busy} onClick={() => changeStatus("draft")} className={btnGhost}>Gỡ xuất bản</button>
        ) : (
          <>
            {status === "draft" && <button disabled={busy} onClick={() => changeStatus("review")} className={btnGhost}>Gửi duyệt</button>}
            {(isAdmin || status !== "review") && <button disabled={busy} onClick={() => changeStatus("published")} className={btnGhost}><Check aria-hidden size={18} /> Xuất bản</button>}
          </>
        )}
        <button disabled={busy || (!dirty && !metaDirty)} onClick={saveAll} className={btnPrimary}><Save aria-hidden size={18} /> {busy ? "Đang lưu…" : "Lưu"}</button>
      </div>

      {msg && <p role={msg.ok ? "status" : "alert"} className={`rounded-xl p-3 font-bold ${msg.ok ? "bg-grass/15 text-[#17692c]" : "bg-orange/15 text-[#8a4300]"}`}>{msg.text}</p>}

      {problems.length > 0 && (
        <div className="rounded-xl bg-sun/20 p-4 ring-1 ring-sun/50">
          <p className="mb-1 flex items-center gap-2 font-bold text-[#7a5a00]"><AlertTriangle aria-hidden size={18} /> Cần sửa trước khi xuất bản</p>
          <ul className="list-disc space-y-0.5 pl-6 text-base text-[#5c4300]">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
        </div>
      )}

      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink/10">
        <h2 className="mb-3 text-xl font-extrabold">Thông tin bài học</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Tiêu đề</span>
            <input value={meta.title} onChange={(e) => { setMeta({ ...meta, title: e.target.value }); setMetaDirty(true); }} className={inputCls} /></label>
          <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Đường dẫn (slug)</span>
            <div className="flex gap-2">
              <input value={meta.slug} onChange={(e) => { setMeta({ ...meta, slug: e.target.value }); setMetaDirty(true); }} className={inputCls} />
              <button type="button" title="Tạo từ tiêu đề" onClick={() => { setMeta({ ...meta, slug: slugify(meta.title) }); setMetaDirty(true); }} className={btnGhost}>Tự tạo</button>
            </div></label>
          <label className="block sm:col-span-2"><span className="mb-1 block text-sm font-bold text-ink/60">Tóm tắt</span>
            <input value={meta.summary} onChange={(e) => { setMeta({ ...meta, summary: e.target.value }); setMetaDirty(true); }} className={inputCls} /></label>
          <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Chương</span>
            <select value={meta.unit_id} onChange={(e) => { setMeta({ ...meta, unit_id: e.target.value }); setMetaDirty(true); }} className={inputCls}>
              {units.map((u) => <option key={u.id} value={u.id}>{u.title}</option>)}
            </select></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Thời lượng (phút)</span>
              <input type="number" min={0} max={30} value={meta.est_minutes} onChange={(e) => { setMeta({ ...meta, est_minutes: Number(e.target.value) }); setMetaDirty(true); }} className={inputCls} /></label>
            <label className="block"><span className="mb-1 block text-sm font-bold text-ink/60">Thưởng XP</span>
              <input type="number" min={0} max={1000} value={meta.xp_reward} onChange={(e) => { setMeta({ ...meta, xp_reward: Number(e.target.value) }); setMetaDirty(true); }} className={inputCls} /></label>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-2xl font-extrabold">Nội dung ({items.length} khối)</h2>
          <div className="flex flex-wrap items-center gap-2">
            <select value={addKind} onChange={(e) => setAddKind(e.target.value)} aria-label="Loại khối" className={`${inputCls} w-auto`}>
              {BLOCK_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
            <button type="button" onClick={add} className={btnPrimary}><Plus aria-hidden size={18} /> Thêm khối</button>
          </div>
        </div>
        {dupIds.length > 0 && <p role="alert" className="mb-3 rounded-xl bg-orange/15 p-3 font-bold text-[#8a4300]">Id khối bị trùng: {[...new Set(dupIds)].join(", ")}</p>}

        <div className="space-y-3">
          {items.length === 0 && <p className="rounded-xl bg-cloud/60 p-6 text-center text-ink/60">Bài chưa có khối nội dung nào.</p>}
          {items.map((it, i) => (
            <BlockCard
              key={it.uid}
              index={i}
              total={items.length}
              block={it.block}
              onChange={(b) => update((l) => l.map((x) => (x.uid === it.uid ? { ...x, block: b } : x)))}
              onMove={(dir) => update((l) => { const c = [...l]; [c[i], c[i + dir]] = [c[i + dir], c[i]]; return c; })}
              onDuplicate={() => update((l) => { const c = [...l]; c.splice(i + 1, 0, mk({ ...it.block, id: nextBlockId(l.map((x) => x.block)) })); return c; })}
              onRemove={() => { if (window.confirm(`Xoá khối ${it.block.id}?`)) update((l) => l.filter((x) => x.uid !== it.uid)); }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
