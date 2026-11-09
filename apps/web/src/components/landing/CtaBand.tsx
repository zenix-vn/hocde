import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";

export function CtaBand() {
  return (
    <section aria-labelledby="cta-title" className="mx-auto max-w-6xl px-4 pb-20">
      <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-orange to-[#ffb020] px-6 py-14 text-center text-white shadow-soft sm:px-12">
        <div aria-hidden className="absolute -left-10 -top-10 -z-10 size-48 rounded-full bg-white/15" />
        <div aria-hidden className="absolute -bottom-16 right-10 -z-10 size-56 rounded-full bg-white/10" />
        <Image src="/brand/mascot.png" alt="" width={110} height={108} className="mx-auto mb-4 animate-wiggle" />
        <h2 id="cta-title" className="mx-auto max-w-2xl text-4xl font-extrabold sm:text-5xl">
          Cho con bắt đầu bài học đầu tiên hôm nay!
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
          Chỉ 5 phút mỗi ngày, con sẽ thấy việc học thú vị hơn nhiều.
        </p>
        <div className="mt-8">
          <ButtonLink href="/dang-ky" tone="white" size="lg">Đăng ký miễn phí</ButtonLink>
        </div>
      </div>
    </section>
  );
}
