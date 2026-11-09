"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LockKeyhole } from "lucide-react";
import { call } from "@/lib/client-api";

const field = "mt-1 min-h-14 w-full rounded-2xl border-2 border-ink/15 px-4 text-center text-2xl tracking-[0.5em] focus:border-brand focus:outline-none";

/** mode="set": đặt PIN lần đầu (nhập 2 lần). mode="verify": nhập PIN để mở khu phụ huynh. */
export function PinForm({ mode, canChange }: { mode: "set" | "verify"; canChange?: boolean }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [again, setAgain] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const digits = (v: string) => v.replace(/\D/g, "").slice(0, 6);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (mode === "set" && pin !== again) return setError("Hai lần nhập PIN chưa giống nhau");
    setBusy(true);
    const r = mode === "set" ? await call("PUT", "/me/pin", { pin }) : await call("POST", "/me/pin/verify", { pin });
    setBusy(false);
    if (!r.ok) {
      setPin("");
      setAgain("");
      return setError(r.message);
    }
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm rounded-blob bg-white p-7 text-center shadow-soft ring-1 ring-brand/10">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-sun text-ink"><LockKeyhole aria-hidden size={32} /></span>
      <h2 className="mt-4 text-2xl font-extrabold">{mode === "set" ? "Tạo mã PIN phụ huynh" : "Nhập mã PIN"}</h2>
      <p className="mt-1 text-ink/70">
        {mode === "set"
          ? "Mã PIN gồm 4–6 chữ số giúp bé không tự ý đổi cài đặt hay xoá hồ sơ."
          : "Khu vực này chỉ dành cho bố mẹ."}
      </p>

      <label className="mt-5 block text-left font-bold" htmlFor="pin">{mode === "set" ? "Mã PIN mới" : "Mã PIN"}</label>
      <input id="pin" type="password" inputMode="numeric" autoComplete="off" autoFocus required minLength={4} maxLength={6}
        value={pin} onChange={(e) => setPin(digits(e.target.value))} className={field} />

      {mode === "set" && (
        <>
          <label className="mt-4 block text-left font-bold" htmlFor="pin2">Nhập lại mã PIN</label>
          <input id="pin2" type="password" inputMode="numeric" autoComplete="off" required minLength={4} maxLength={6}
            value={again} onChange={(e) => setAgain(digits(e.target.value))} className={field} />
        </>
      )}

      {error && <p role="alert" className="mt-4 rounded-2xl bg-orange/15 p-3 font-bold text-[#8a4300]">{error}</p>}

      <button disabled={busy || pin.length < 4}
        className="mt-6 min-h-14 w-full rounded-2xl bg-brand font-display text-xl font-bold text-white shadow-[0_6px_0_#08479b] active:translate-y-1 active:shadow-[0_2px_0_#08479b] disabled:opacity-50">
        {busy ? "Đang kiểm tra…" : mode === "set" ? "Lưu mã PIN" : "Mở khoá"}
      </button>
      {canChange && <p className="mt-3 text-sm text-ink/55">Quên PIN? Tính năng đặt lại sẽ sớm có.</p>}
    </form>
  );
}
