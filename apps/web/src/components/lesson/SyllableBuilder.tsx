"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import { speak } from "@/lib/speech";
import { composeSyllable, TONE_MARKS } from "@/lib/vietnamese";

type Config = { onset: string; rhyme: string; tones?: string[]; caption?: string };

const toneLabel: Record<string, string> = {
  ngang: "không dấu", huyền: "huyền", sắc: "sắc", hỏi: "hỏi", ngã: "ngã", nặng: "nặng",
};

const say = (text: string) => speak([{ text, lang: "vi" }]);

export function SyllableBuilder({ config }: { config: Config }) {
  const tones = (config.tones ?? Object.keys(TONE_MARKS)).filter((t) => t in TONE_MARKS);
  const [tone, setTone] = useState(tones[0] ?? "ngang");
  const word = composeSyllable(config.onset, config.rhyme, tone);

  return (
    <div className="rounded-blob bg-white p-5 shadow-soft ring-1 ring-brand/10">
      {config.caption && <p className="mb-4 text-ink/70">{config.caption}</p>}
      <div className="flex flex-wrap items-center justify-center gap-3 font-display text-5xl font-extrabold sm:text-6xl">
        <span className="rounded-2xl bg-sky/20 px-4 py-2 text-sky">{config.onset}</span>
        <span aria-hidden>+</span>
        <span className="rounded-2xl bg-berry/15 px-4 py-2 text-berry">{config.rhyme}</span>
        <span aria-hidden>=</span>
        <span aria-live="polite" className="rounded-2xl bg-sun/40 px-5 py-2">{word}</span>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2" role="group" aria-label="Chọn dấu thanh">
        {tones.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => { setTone(t); say(composeSyllable(config.onset, config.rhyme, t)); }}
            aria-pressed={tone === t}
            className={`min-h-12 rounded-xl px-4 font-bold ring-2 transition ${
              tone === t ? "bg-brand text-white ring-brand" : "bg-white ring-ink/10 hover:bg-cloud"
            }`}
          >
            {toneLabel[t] ?? t}
          </button>
        ))}
      </div>
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={() => say(word)}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-grass px-5 font-extrabold text-white shadow-soft hover:brightness-105"
        >
          <Volume2 aria-hidden size={20} /> Nghe đọc “{word}”
        </button>
      </div>
    </div>
  );
}
