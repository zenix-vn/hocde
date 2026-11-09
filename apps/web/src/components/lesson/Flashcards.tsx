"use client";

import { useState } from "react";
import { Volume2 } from "lucide-react";
import type { Lang } from "@/lib/narration";
import { speak } from "@/lib/speech";

type Card = { word: string; emoji?: string; meaning?: string };
type Config = { cards: Card[]; lang?: Lang; caption?: string };

/** Thẻ từ: chạm vào thẻ để nghe từ (và nghĩa tiếng Việt nếu có). */
export function Flashcards({ config }: { config: Config }) {
  const lang: Lang = config.lang === "vi" ? "vi" : "en";
  const [active, setActive] = useState<number | null>(null);

  function play(i: number) {
    const c = config.cards[i];
    setActive(i);
    speak([
      { text: c.word, lang },
      ...(c.meaning ? [{ text: c.meaning, lang: "vi" as Lang }] : []),
    ]);
  }

  return (
    <div className="rounded-blob bg-white p-5 shadow-soft ring-1 ring-brand/10">
      {config.caption && <p className="mb-3 text-lg text-ink/70">{config.caption}</p>}
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {config.cards.map((c, i) => (
          <li key={c.word}>
            <button
              type="button"
              onClick={() => play(i)}
              aria-label={`Nghe từ ${c.word}`}
              className={`flex min-h-36 w-full flex-col items-center justify-center gap-1 rounded-2xl p-3 ring-2 transition active:scale-95 ${
                active === i ? "bg-sun/40 ring-sun" : "bg-cream ring-ink/10 hover:bg-cloud"
              }`}
            >
              <span aria-hidden className="text-6xl">{c.emoji ?? "🔤"}</span>
              <span className="font-display text-3xl font-extrabold">{c.word}</span>
              {c.meaning && <span className="text-base text-ink/60">{c.meaning}</span>}
              <Volume2 aria-hidden size={20} className="text-grass" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
