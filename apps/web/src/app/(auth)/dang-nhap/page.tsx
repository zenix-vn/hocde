import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Đăng nhập",
  robots: { index: false, follow: true },
  alternates: { canonical: "/dang-nhap" },
};

export default async function LoginPage(props: PageProps<"/dang-nhap">) {
  if (await getUser()) redirect("/hoc");
  const { error } = await props.searchParams;
  return (
    <AuthShell title="Chào mừng bạn quay lại!" subtitle="Đăng nhập tài khoản phụ huynh để tiếp tục." error={typeof error === "string" ? error : undefined}>
      <GoogleButton href="/api/v1/auth/google/start?mode=login">Tiếp tục với Google</GoogleButton>
      <p className="mt-6 text-center text-ink/70">
        Chưa có tài khoản?{" "}
        <Link href="/dang-ky" className="font-extrabold text-brand underline-offset-4 hover:underline">Đăng ký miễn phí</Link>
      </p>
    </AuthShell>
  );
}
