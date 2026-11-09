"use client";

import { useState } from "react";
import { numberWord, type Lang } from "@/lib/narration";
import { speak } from "@/lib/speech";

type Config = { count: number; emoji?: string; caption?: string; lang?: Lang };

/** Đếm bằng cách chạm: mỗi lần chạm một vật, máy đọc số tương ứng ("một", "hai", ...). */
export function Counters({ config }: { config: Config }) {
  const lang: Lang = config.lang === "en" ? "en" : "vi";
  const total = Math.min(Math.max(config.count, 1), 20);
  const [counted, setCounted] = useState<number[]>([]);

  function tap(i: number) {
    if (counted.includes(i)) return;
    const next = [...counted, i];
    setCounted(next);
    speak([{ text: numberWord(next.length, lang), lang }]);
  }

  return (
    <div className="rounded-blob bg-white p-5 shadow-soft ring-1 ring-brand/10">
      {config.caption && <p className="mb-3 text-lg text-ink/70">{config.caption}</p>}
      <div className="flex flex-wrap justify-center gap-3" role="group" aria-label="Chạm từng vật để đếm">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => tap(i)}
            aria-pressed={counted.includes(i)}
            aria-label={counted.includes(i) ? `Đã đếm ${counted.indexOf(i) + 1}` : "Chạm để đếm"}
            className={`grid size-16 place-items-center rounded-2xl text-4xl ring-2 transition ${
              counted.includes(i) ? "bg-sun/40 ring-sun" : "bg-cream ring-ink/10 hover:bg-cloud"
            }`}
          >
            {counted.includes(i) ? <span className="font-display text-3xl font-extrabold">{counted.indexOf(i) + 1}</span> : (config.emoji ?? "🍎")}
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-center gap-4">
        <p aria-live="polite" className="font-display text-3xl font-extrabold">Đã đếm: {counted.length}</p>
        {counted.length > 0 && (
          <button type="button" onClick={() => setCounted([])} className="min-h-11 rounded-xl px-3 font-bold text-brand underline">Đếm lại</button>
        )}
      </div>
    </div>
  );
}
