"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
        } finally {
          router.replace("/");
          router.refresh();
        }
      }}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 font-bold text-ink/80 ring-2 ring-ink/10 transition hover:bg-cloud disabled:opacity-60"
    >
      <LogOut aria-hidden size={18} /> Đăng xuất
    </button>
  );
}
