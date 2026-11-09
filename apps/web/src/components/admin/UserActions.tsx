"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { acall } from "@/lib/admin-client";
import { ROLE_LABEL, type UserRow } from "@/lib/admin-types";
import { btnDanger, btnGhost, btnPrimary, inputCls } from "./ui";

export function UserActions({ user, isSelf, sessions }: { user: UserRow; isSelf: boolean; sessions: number }) {
  const router = useRouter();
  const [role, setRole] = useState(user.role);
  const [name, setName] = useState(user.full_name);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function run(fn: () => ReturnType<typeof acall>, okText: string, after?: () => void) {
    setBusy(true);
    setMsg(null);
    const r = await fn();
    setBusy(false);
    if (!r.ok) return setMsg({ ok: false, text: r.message });
    setMsg({ ok: true, text: okText });
    if (after) after();
    else router.refresh();
  }

  const disabled = !!user.disabled_at;
  const dirty = role !== user.role || name.trim() !== user.full_name;

  return (
    <div className="space-y-5">
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`rounded-xl p-3 font-bold ${msg.ok ? "bg-grass/15 text-[#17692c]" : "bg-orange/15 text-[#8a4300]"}`}>{msg.text}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-ink/60">Họ tên</span>
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} className={inputCls} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-bold text-ink/60">Vai trò</span>
          <select value={role} onChange={(e) => setRole(e.target.value)} disabled={isSelf} className={inputCls}>
            {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {isSelf && <span className="mt-1 block text-sm text-ink/55">Bạn không thể tự đổi vai trò của mình.</span>}
        </label>
      </div>
      <button
        disabled={busy || !dirty}
        onClick={() => run(() => acall("PATCH", `/users/${user.id}`, { role, full_name: name }), "Đã lưu thay đổi.")}
        className={btnPrimary}
      >
        <ShieldCheck aria-hidden size={18} /> Lưu thay đổi
      </button>

      <hr className="border-ink/10" />

      <div className="flex flex-wrap gap-3">
        {!isSelf && (
          <button
            disabled={busy}
            className={disabled ? btnGhost : btnDanger}
            onClick={() => {
              if (!disabled && !window.confirm(`Khoá tài khoản ${user.email}? Người này sẽ bị đăng xuất và không đăng nhập lại được.`)) return;
              run(() => acall("PATCH", `/users/${user.id}`, { disabled: !disabled }), disabled ? "Đã mở khoá tài khoản." : "Đã khoá tài khoản.");
            }}
          >
            <Ban aria-hidden size={18} /> {disabled ? "Mở khoá tài khoản" : "Khoá tài khoản"}
          </button>
        )}
        <button
          disabled={busy || sessions === 0}
          className={btnGhost}
          onClick={() => run(() => acall("POST", `/users/${user.id}/revoke-sessions`), "Đã đăng xuất mọi thiết bị.")}
        >
          <LogOut aria-hidden size={18} /> Đăng xuất mọi thiết bị
        </button>
        {!isSelf && (
          <button
            disabled={busy}
            className={btnDanger}
            onClick={() => {
              if (!window.confirm(`XOÁ VĨNH VIỄN tài khoản ${user.email}?\nToàn bộ hồ sơ của bé và tiến độ học sẽ mất, không khôi phục được.`)) return;
              run(() => acall("DELETE", `/users/${user.id}`), "Đã xoá tài khoản.", () => router.replace("/admin/nguoi-dung"));
            }}
          >
            <Trash2 aria-hidden size={18} /> Xoá vĩnh viễn
          </button>
        )}
      </div>
    </div>
  );
}
