"use client";

import { useState } from "react";
import { CheckCircle2, RotateCcw, Star, XCircle } from "lucide-react";

const OPTIONS = [10, 11, 12, 13];
const ANSWER = 12;

export function DemoQuiz() {
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const correct = checked && picked === ANSWER;
  const wrong = checked && picked !== ANSWER;

  const reset = () => {
    setPicked(null);
    setChecked(false);
  };

  return (
    <div className="overflow-hidden rounded-blob bg-white shadow-soft ring-1 ring-brand/10">
      <div className="flex items-center gap-3 bg-cloud px-5 py-3">
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-white">
          <div className="h-full w-2/3 rounded-full bg-grass" />
        </div>
        <span className="font-display font-bold text-ink/60">Câu 2/3</span>
      </div>

      <div className="px-5 pb-6 pt-6 sm:px-8">
        <p className="font-bold text-ink/60">Cộng có nhớ · Toán lớp 2</p>
        <p className="mt-1 font-display text-5xl font-extrabold">7 + 5 = ?</p>

        {/* trực quan: 7 + 5 viên bi */}
        <div aria-hidden className="mt-4 flex flex-wrap items-center gap-1.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <span key={`a${i}`} className="size-6 rounded-full bg-sky shadow-inner" />
          ))}
          <span className="mx-2 font-display text-2xl font-bold text-ink/40">+</span>
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={`b${i}`} className="size-6 rounded-full bg-orange shadow-inner" />
          ))}
        </div>

        <div role="radiogroup" aria-label="Chọn đáp án" className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {OPTIONS.map((n) => {
            const sel = picked === n;
            const state =
              checked && n === ANSWER
                ? "border-grass bg-grass/15 text-[#177a31]"
                : checked && sel
                  ? "border-orange bg-orange/15 text-[#a85200]"
                  : sel
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-ink/15 bg-white hover:border-brand/50 hover:bg-cloud";
            return (
              <button
                key={n}
                role="radio"
                aria-checked={sel}
                disabled={checked}
                onClick={() => setPicked(n)}
                className={`min-h-16 rounded-2xl border-2 border-b-4 font-display text-3xl font-extrabold transition active:translate-y-0.5 ${state}`}
              >
                {n}
              </button>
            );
          })}
        </div>

        <div aria-live="polite" className="mt-6 min-h-24">
          {!checked && (
            <button
              onClick={() => setChecked(true)}
              disabled={picked === null}
              className="min-h-14 w-full rounded-2xl bg-grass px-6 font-display text-xl font-bold text-white shadow-[0_6px_0_#2a9d46] transition enabled:hover:brightness-105 enabled:active:translate-y-1 enabled:active:shadow-[0_2px_0_#2a9d46] disabled:bg-ink/15 disabled:shadow-[0_6px_0_#c9ccd6] disabled:text-ink/40"
            >
              Kiểm tra
            </button>
          )}
          {correct && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-grass/15 p-4">
              <div>
                <p className="flex items-center gap-2 font-display text-xl font-extrabold text-[#177a31]">
                  <CheckCircle2 aria-hidden /> Giỏi quá! +10 XP
                </p>
                <p className="mt-1 text-ink/70">7 + 3 = 10, thêm 2 nữa là 12.</p>
              </div>
              <span className="flex" aria-label="3 sao">
                {[0, 1, 2].map((i) => (
                  <Star key={i} aria-hidden className="text-sun" fill="currentColor" size={30} />
                ))}
              </span>
            </div>
          )}
          {wrong && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-orange/15 p-4">
              <div>
                <p className="flex items-center gap-2 font-display text-xl font-extrabold text-[#a85200]">
                  <XCircle aria-hidden /> Gần đúng rồi, thử lại nhé!
                </p>
                <p className="mt-1 text-ink/70">Gợi ý: gom đủ 10 trước, rồi đếm thêm phần còn lại.</p>
              </div>
              <button onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 font-bold text-brand ring-2 ring-brand/20 hover:bg-cloud">
                <RotateCcw aria-hidden size={18} /> Thử lại
              </button>
            </div>
          )}
          {correct && (
            <button onClick={reset} className="mt-3 inline-flex items-center gap-2 font-bold text-brand underline-offset-4 hover:underline">
              <RotateCcw aria-hidden size={16} /> Chơi lại
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
