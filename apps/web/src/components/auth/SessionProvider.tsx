"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Trang chủ là trang tĩnh (tốt cho SEO) nên không biết ai đang đăng nhập khi render.
 * Thành phần này hỏi /api/v1/me ở trình duyệt; "unknown" = chưa biết, hiển thị như khách.
 */
type Status = "unknown" | "in" | "out";
const Ctx = createContext<Status>("unknown");

export const useSessionStatus = () => useContext(Ctx);

async function fetchMe(): Promise<boolean> {
  const res = await fetch("/api/v1/me", { credentials: "include", cache: "no-store" });
  return res.ok;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("unknown");

  useEffect(() => {
    let alive = true;
    (async () => {
      let ok = false;
      try {
        ok = await fetchMe();
        if (!ok) {
          // cookie truy cập (15 phút) hết hạn nhưng phiên 30 ngày còn: đổi phiên rồi hỏi lại
          const r = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: "{}" });
          ok = r.ok && (await fetchMe());
        }
      } catch {
        ok = false;
      }
      if (alive) setStatus(ok ? "in" : "out");
    })();
    return () => { alive = false; };
  }, []);

  return <Ctx.Provider value={status}>{children}</Ctx.Provider>;
}
