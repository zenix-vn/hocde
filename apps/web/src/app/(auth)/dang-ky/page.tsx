import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { SignupPanel } from "@/components/auth/SignupPanel";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Đăng ký miễn phí",
  robots: { index: false, follow: true },
  alternates: { canonical: "/dang-ky" },
};

export default async function SignupPage(props: PageProps<"/dang-ky">) {
  if (await getUser()) redirect("/hoc");
  const { error } = await props.searchParams;
  return (
    <AuthShell title="Tạo tài khoản phụ huynh" subtitle="Chỉ mất 10 giây. Sau đó bố mẹ tạo hồ sơ cho con." error={typeof error === "string" ? error : undefined}>
      <SignupPanel />
      <p className="mt-6 text-center text-ink/70">
        Đã có tài khoản?{" "}
        <Link href="/dang-nhap" className="font-extrabold text-brand underline-offset-4 hover:underline">Đăng nhập</Link>
      </p>
    </AuthShell>
  );
}
