import Image from "next/image";
import { Flame, Star, CheckCircle2, Sparkles, ShieldCheck, Clock, Gamepad2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { AuthButton } from "@/components/auth/AuthButton";

const perks = [
  { icon: Clock, text: "Bài học 5–10 phút" },
  { icon: Gamepad2, text: "Học như chơi game" },
  { icon: ShieldCheck, text: "Không quảng cáo" },
];

export function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      {/* nền màu & hình khối trang trí */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_85%_-10%,#bfe6ff_0%,transparent_60%),radial-gradient(40rem_30rem_at_-10%_30%,#ffe3a6_0%,transparent_55%)]" />
      <div aria-hidden className="absolute -left-16 top-40 -z-10 size-48 rounded-full bg-berry/15 blur-2xl" />
      <div aria-hidden className="absolute right-10 bottom-10 -z-10 size-56 rounded-full bg-grape/15 blur-2xl" />

      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-12 md:grid-cols-[1.1fr_0.9fr] md:pb-24 md:pt-20">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-sm font-extrabold text-brand shadow-soft ring-1 ring-brand/10">
            <Sparkles aria-hidden size={16} className="text-orange" />
            Dành cho học sinh Tiểu học &amp; THCS · Lớp 1–9
          </p>

          <h1 className="text-5xl font-extrabold text-ink sm:text-6xl lg:text-7xl">
            Học vui mỗi ngày,{" "}
            <span className="relative inline-block whitespace-nowrap text-brand">
              hiểu bài
              <svg aria-hidden viewBox="0 0 200 14" className="absolute -bottom-2 left-0 w-full" preserveAspectRatio="none">
                <path d="M2 9 Q 50 0 100 7 T 198 6" fill="none" stroke="#ffc93c" strokeWidth="7" strokeLinecap="round" />
              </svg>
            </span>{" "}
            thật nhanh!
          </h1>

          <p className="mt-6 max-w-xl text-xl text-ink/75">
            Website học <strong>Toán, Tiếng Việt, Tiếng Anh và lập trình Python</strong> với bài giảng trực quan,
            bài tập tương tác và phần thưởng mỗi ngày — giúp con yêu việc học.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <AuthButton href="/dang-ky" size="lg">Bắt đầu miễn phí</AuthButton>
            <ButtonLink href="#hoc-thu" tone="ghost" size="lg">Học thử ngay</ButtonLink>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-base font-bold text-ink/70">
            {perks.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-full bg-white text-brand shadow-sm ring-1 ring-brand/10">
                  <Icon aria-hidden size={16} />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        {/* minh hoạ: linh vật + thẻ nổi */}
        <div className="relative mx-auto aspect-square w-full max-w-md">
          <div aria-hidden className="absolute inset-6 rounded-full bg-gradient-to-br from-sky/40 via-white to-sun/50" />
          <div aria-hidden className="absolute inset-0 rounded-full border-2 border-dashed border-brand/20 [animation:spin_40s_linear_infinite]" />
          <Image
            src="/brand/mascot.png"
            alt="Linh vật cuốn sách đội mũ cử nhân của hocde.vn"
            width={616}
            height={603}
            priority
            className="absolute inset-0 m-auto w-[78%] animate-float drop-shadow-[0_20px_30px_rgba(11,99,214,0.25)]"
          />

          <div className="absolute -left-2 top-8 animate-float-slow rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-brand/10 [--r:-6deg]">
            <p className="flex items-center gap-2 font-display text-lg font-bold">
              <Flame aria-hidden className="text-orange" fill="currentColor" size={22} /> 7 ngày liên tiếp
            </p>
          </div>
          <div className="absolute -right-3 top-1/3 animate-float rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-brand/10 [--r:5deg]">
            <p className="flex items-center gap-1 font-display text-lg font-bold">
              {[0, 1, 2].map((i) => (
                <Star key={i} aria-hidden size={22} className="text-sun" fill="currentColor" />
              ))}
            </p>
            <p className="text-sm font-bold text-ink/60">Hoàn hảo!</p>
          </div>
          <div className="absolute -bottom-2 left-6 animate-float-slow rounded-2xl bg-white px-4 py-3 shadow-soft ring-1 ring-brand/10 [--r:3deg]">
            <p className="flex items-center gap-2 font-display text-xl font-bold">
              7 + 5 = 12 <CheckCircle2 aria-hidden className="text-grass" size={24} />
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
