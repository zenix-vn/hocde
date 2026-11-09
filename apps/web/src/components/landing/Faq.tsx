import { Plus } from "lucide-react";
import { FAQS } from "@/lib/site";

export function Faq() {
  return (
    <section id="hoi-dap" aria-labelledby="hoi-dap-title" className="mx-auto max-w-3xl px-4 py-20">
      <div className="text-center">
        <p className="font-display text-lg font-bold text-orange">Hỏi đáp</p>
        <h2 id="hoi-dap-title" className="mt-2 text-4xl font-extrabold sm:text-5xl">
          Câu hỏi thường gặp
        </h2>
      </div>
      <div className="mt-10 space-y-3">
        {FAQS.map((f, i) => (
          <details key={f.q} name="faq" open={i === 0} className="group rounded-2xl bg-white ring-1 ring-ink/10 open:shadow-soft">
            <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3">
              <h3 className="text-lg font-extrabold">{f.q}</h3>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-cloud text-brand transition group-open:rotate-45 group-open:bg-brand group-open:text-white">
                <Plus aria-hidden size={18} strokeWidth={3} />
              </span>
            </summary>
            <p className="px-5 pb-5 text-ink/75">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
