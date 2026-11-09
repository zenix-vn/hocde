"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { call } from "@/lib/client-api";
import { MAX_PROFILES, type Profile } from "@/lib/profiles";
import { Avatar } from "./Avatar";

export function ProfilePicker({ profiles }: { profiles: Profile[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function choose(id: string) {
    setBusy(id);
    setError("");
    const r = await call("POST", `/profiles/${id}/select`);
    if (!r.ok) {
      setBusy(null);
      setError(r.message);
      return;
    }
    router.push("/hoc");
    router.refresh();
  }

  return (
    <>
      {error && <p role="alert" className="mb-6 rounded-2xl bg-orange/15 p-4 text-center font-bold text-[#8a4300]">{error}</p>}
      <ul className="flex flex-wrap justify-center gap-6">
        {profiles.map((p) => (
          <li key={p.id}>
            <button
              onClick={() => choose(p.id)}
              disabled={busy !== null}
              className="group flex w-40 flex-col items-center gap-3 rounded-blob bg-white p-5 shadow-soft ring-1 ring-brand/10 transition hover:-translate-y-1 disabled:opacity-60"
            >
              <span className="transition group-hover:scale-110"><Avatar avatarKey={p.avatar_key} size="lg" /></span>
              <span className="max-w-full truncate font-display text-2xl font-extrabold">{p.display_name}</span>
              <span className="rounded-full bg-cloud px-3 py-0.5 text-sm font-bold text-brand">Lớp {p.grade}</span>
              {busy === p.id && <span className="text-sm font-bold text-ink/60">Đang vào…</span>}
            </button>
          </li>
        ))}
        {profiles.length < MAX_PROFILES && (
          <li>
            <Link
              href="/phu-huynh"
              className="flex h-full min-h-56 w-40 flex-col items-center justify-center gap-3 rounded-blob border-2 border-dashed border-brand/30 p-5 text-brand transition hover:bg-white"
            >
              <span className="grid size-16 place-items-center rounded-full bg-cloud"><Plus aria-hidden size={32} /></span>
              <span className="font-display text-lg font-bold">Thêm bé</span>
            </Link>
          </li>
        )}
      </ul>
    </>
  );
}
