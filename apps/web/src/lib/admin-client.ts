import { call, type ApiResult } from "@/lib/client-api";

/** Như call(), nhưng nếu access token hết hạn (15 phút) thì tự làm mới phiên rồi thử lại một lần. */
export async function acall<T = unknown>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  const r = await call<T>(method, `/admin${path}`, body);
  if (!r.ok && r.code === "UNAUTHORIZED") {
    const rf = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    }).catch(() => null);
    if (rf?.ok) return call<T>(method, `/admin${path}`, body);
  }
  return r;
}
