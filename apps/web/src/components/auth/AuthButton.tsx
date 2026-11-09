"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { useSessionStatus } from "./SessionProvider";

type ButtonProps = ComponentProps<typeof ButtonLink>;

/** Nút gọi hành động: khách thấy `children` (đăng ký), người đã đăng nhập thấy "Vào học". */
export function AuthButton({ children, signedInLabel = "Vào học ngay", ...props }: ButtonProps & { children: ReactNode; signedInLabel?: string }) {
  const signedIn = useSessionStatus() === "in";
  return signedIn ? (
    <ButtonLink {...props} href="/hoc">{signedInLabel}</ButtonLink>
  ) : (
    <ButtonLink {...props}>{children}</ButtonLink>
  );
}

/** Liên kết "Đăng nhập" – ẩn khi đã đăng nhập. */
export function LoginLink({ className }: { className?: string }) {
  if (useSessionStatus() === "in") return null;
  return <Link href="/dang-nhap" className={className}>Đăng nhập</Link>;
}
