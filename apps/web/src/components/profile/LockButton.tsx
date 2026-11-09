"use client";

import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { call } from "@/lib/client-api";

export function LockButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => { await call("POST", "/me/lock"); router.refresh(); }}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 font-bold text-ink/80 ring-2 ring-ink/10 hover:bg-cloud"
    >
      <LockKeyhole aria-hidden size={18} /> Khoá lại
    </button>
  );
}
