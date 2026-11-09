import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Profile } from "@/lib/profiles";

export type User = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  has_pin: boolean;
  unlocked: boolean;
};

const API = process.env.API_INTERNAL_URL ?? "http://localhost:8080";

/** Lấy người dùng hiện tại từ cookie. null = chưa đăng nhập / access token hết hạn. */
export async function getUser(): Promise<User | null> {
  const cookie = (await cookies()).toString();
  if (!cookie.includes("hd_access=")) return null;
  const res = await fetch(`${API}/api/v1/me`, { headers: { cookie }, cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()).data as User;
}

/**
 * Dùng trong trang cần đăng nhập. Nếu access token hết hạn, chuyển qua endpoint đổi phiên
 * (dùng refresh cookie) rồi quay lại; `renewed` chặn vòng lặp chuyển hướng.
 */
export async function requireUser(path: string, renewed: boolean): Promise<User> {
  const user = await getUser();
  if (user) return user;
  if (renewed) redirect("/dang-nhap");
  redirect(`/api/v1/auth/session/renew?next=${encodeURIComponent(path)}`);
}

async function authed<T>(path: string): Promise<T | null> {
  const cookie = (await cookies()).toString();
  const res = await fetch(`${API}/api/v1${path}`, { headers: { cookie }, cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()).data as T;
}

export async function getProfiles(): Promise<Profile[]> {
  return (await authed<Profile[]>("/profiles")) ?? [];
}

/** Hồ sơ con đang học trên thiết bị này, null nếu chưa chọn. */
export async function getActiveProfile(): Promise<Profile | null> {
  return authed<Profile>("/profiles/active");
}
