export type ApiResult<T> = { ok: true; data: T } | { ok: false; code: string; message: string };

/** Gọi API từ trình duyệt (cookie tự đính kèm). Luôn gửi body để qua được proxy với POST rỗng. */
export async function call<T = unknown>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`/api/v1${path}`, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: method === "GET" ? undefined : JSON.stringify(body ?? {}),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      return { ok: false, code: json?.error?.code ?? "INTERNAL", message: json?.error?.message ?? "Có lỗi xảy ra, vui lòng thử lại" };
    }
    return { ok: true, data: json?.data as T };
  } catch {
    return { ok: false, code: "NETWORK", message: "Không kết nối được máy chủ. Hãy kiểm tra mạng và thử lại." };
  }
}
