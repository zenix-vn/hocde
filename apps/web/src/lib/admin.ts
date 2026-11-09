import "server-only";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { requireUser, type User } from "@/lib/auth";
import type { Meta } from "@/lib/admin-types";

const API = process.env.API_INTERNAL_URL ?? "http://localhost:8080";

type SP = Record<string, string | string[] | undefined>;

/** Bắt buộc đăng nhập với vai trò admin/editor; người không đủ quyền thấy 404 (không lộ sự tồn tại của trang). */
export async function requireStaff(path: string, sp: SP, opts?: { adminOnly?: boolean }): Promise<User> {
  const user = await requireUser(path, sp.renewed === "1");
  const ok = opts?.adminOnly ? user.role === "admin" : user.role === "admin" || user.role === "editor";
  if (!ok) notFound();
  return user;
}

export async function adminGet<T>(path: string): Promise<{ data: T; meta?: Meta }> {
  const cookie = (await cookies()).toString();
  const res = await fetch(`${API}/api/v1/admin${path}`, { headers: { cookie }, cache: "no-store" });
  if (res.status === 404 || res.status === 403) notFound();
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  return { data: body.data as T, meta: body.meta };
}

/** Đọc một tham số truy vấn dạng chuỗi (bỏ qua mảng). */
export function qs(sp: SP, key: string): string {
  const v = sp[key];
  return typeof v === "string" ? v : "";
}

export function pageOf(sp: SP): number {
  const n = parseInt(qs(sp, "page"), 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Dựng chuỗi query từ các tham số không rỗng. */
export function query(params: Record<string, string | number | undefined>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "" && v !== 0) u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
}
