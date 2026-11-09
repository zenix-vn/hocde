import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfilePicker } from "@/components/profile/ProfilePicker";
import { getProfiles, requireUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Chọn hồ sơ", robots: { index: false, follow: false } };

export default async function ChooseProfile(props: PageProps<"/chon-ho-so">) {
  const sp = await props.searchParams;
  await requireUser("/chon-ho-so", sp.renewed === "1");
  const profiles = await getProfiles();
  if (profiles.length === 0) redirect("/phu-huynh?moi=1");

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center px-4 py-10">
      <Image src="/brand/mascot.png" alt="" width={96} height={94} className="animate-float" priority />
      <h1 className="mt-4 text-center text-4xl font-extrabold sm:text-5xl">Ai đang học đây nhỉ?</h1>
      <p className="mb-10 mt-2 text-center text-ink/70">Chạm vào hình của bé để bắt đầu.</p>
      <ProfilePicker profiles={profiles} />
      <Link href="/phu-huynh" className="mt-12 font-bold text-brand underline-offset-4 hover:underline">Khu vực phụ huynh</Link>
    </main>
  );
}
