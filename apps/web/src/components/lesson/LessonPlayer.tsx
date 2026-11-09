"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Star, Volume2, VolumeX } from "lucide-react";
import type { Block } from "@/lib/learn";
import { blockSegments } from "@/lib/narration";
import { speak, stopSpeaking, useAutoRead, useHasVoice } from "@/lib/speech";
import { Counters } from "./Counters";
import { Exercise, type ExerciseBlock } from "./Exercise";
import { Flashcards } from "./Flashcards";
import { Markdown } from "./Markdown";
import { SpeakButton } from "./SpeakButton";
import { SyllableBuilder } from "./SyllableBuilder";
import { VoicePicker } from "./VoicePicker";

type Props = { slug: string; title: string; xp: number; blocks: Block[]; backHref: string };

const callout: Record<string, string> = { remember: "Ghi nhớ", tip: "Mẹo", note: "Lưu ý" };

export function LessonPlayer({ slug, title, xp, blocks, backHref }: Props) {
  const [index, setIndex] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [autoRead, setAutoRead] = useAutoRead();
  const hasVi = useHasVoice("vi");
  const total = blocks.length;
  const exerciseCount = blocks.filter((b) => b.type === "exercise").length;
  const block = blocks[index];
  const isLast = index === total - 1;
  const segments = blockSegments(block);

  // Tự động đọc mỗi màn khi hiện ra (bé chưa biết đọc chữ). Trình duyệt có thể chặn lần đầu: nút loa luôn dùng được.
  useEffect(() => {
    if (autoRead) speak(blockSegments(block));
  }, [block, autoRead]);
  useEffect(() => stopSpeaking, []);

  const next = () => setIndex((i) => Math.min(i + 1, total - 1));
  const percent = Math.round(((index + 1) / total) * 100);

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-4 py-5">
      <header className="flex items-center gap-3">
        <Link href={backHref} className="inline-flex min-h-11 items-center rounded-xl px-3 font-bold text-ink/70 hover:bg-white">← Thoát</Link>
        <h1 className="min-w-0 flex-1 truncate text-center text-xl font-extrabold">{title}</h1>
        <button
          type="button"
          onClick={() => setAutoRead(!autoRead)}
          aria-pressed={autoRead}
          aria-label={autoRead ? "Tắt tự động đọc" : "Bật tự động đọc"}
          className={`inline-flex min-h-11 items-center gap-1 rounded-xl px-3 font-bold ring-2 ${autoRead ? "bg-grass/20 text-green-900 ring-grass" : "bg-white text-ink/60 ring-ink/10"}`}
        >
          {autoRead ? <Volume2 aria-hidden size={20} /> : <VolumeX aria-hidden size={20} />}
          <span className="hidden sm:inline">{autoRead ? "Đọc: Bật" : "Đọc: Tắt"}</span>
        </button>
      </header>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Tiến độ bài học"
        className="mt-3 h-3 overflow-hidden rounded-full bg-white ring-1 ring-ink/10">
        <div className="h-full rounded-full bg-grass transition-all" style={{ width: `${percent}%` }} />
      </div>

      <VoicePicker />

      {hasVi === false && (
        <p role="note" className="mt-4 rounded-xl bg-sun/30 px-4 py-3 text-base">
          Thiết bị này chưa có giọng đọc tiếng Việt nên bé có thể không nghe được. Phụ huynh hãy dùng điện thoại/máy tính bảng
          hoặc cài thêm giọng đọc tiếng Việt trong phần Cài đặt ngôn ngữ của máy.
        </p>
      )}

      <section key={block.id} className="mt-6 space-y-5">
        {block.type === "mascot_say" && (
          <div className="flex items-start gap-3">
            <span aria-hidden className="text-6xl">🦊</span>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="rounded-blob rounded-tl-none bg-white p-4 text-xl font-bold shadow-soft ring-1 ring-brand/10">{String(block.text)}</p>
              <SpeakButton segments={segments} />
            </div>
          </div>
        )}

        {block.type === "text" && (
          <div className="rounded-blob bg-white p-5 text-xl shadow-soft ring-1 ring-brand/10">
            <Markdown text={String(block.markdown)} />
            <div className="mt-3"><SpeakButton segments={segments} /></div>
          </div>
        )}

        {block.type === "callout" && (
          <div className="rounded-blob bg-sun/30 p-5 text-xl ring-2 ring-sun">
            <p className="mb-1 text-sm font-extrabold uppercase tracking-wide text-orange">{callout[String(block.variant)] ?? "Ghi nhớ"}</p>
            <Markdown text={String(block.markdown)} />
            <div className="mt-3"><SpeakButton segments={segments} /></div>
          </div>
        )}

        {block.type === "interactive" && (
          <>
            {segments.length > 0 && <SpeakButton segments={segments} label="Nghe hướng dẫn" />}
            {block.kind === "syllable_builder" && (
              <SyllableBuilder config={block.config as { onset: string; rhyme: string; tones?: string[]; caption?: string }} />
            )}
            {block.kind === "counters" && <Counters config={block.config as { count: number; emoji?: string; caption?: string }} />}
            {block.kind === "flashcards" && <Flashcards config={block.config as { cards: { word: string; emoji?: string; meaning?: string }[]; caption?: string }} />}
            {!["syllable_builder", "counters", "flashcards"].includes(String(block.kind)) && (
              <p className="rounded-blob bg-white p-5 ring-1 ring-ink/10">Hoạt động này sắp có. Bé bấm tiếp tục nhé!</p>
            )}
          </>
        )}

        {block.type === "exercise" && (
          <Exercise
            lessonSlug={slug}
            block={block as unknown as ExerciseBlock}
            onDone={(ok) => { if (ok) setFirstTry((n) => n + 1); next(); }}
          />
        )}

        {block.type === "summary" && (
          <Finish title={title} xp={xp} backHref={backHref} text={String(block.markdown)} stars={stars(firstTry, exerciseCount)}
            speak={<SpeakButton segments={segments} />} />
        )}

        {block.type !== "exercise" && block.type !== "summary" && (
          <div className="flex justify-end">
            <button type="button" onClick={next} disabled={isLast}
              className="min-h-12 rounded-xl bg-brand px-8 text-lg font-extrabold text-white shadow-soft disabled:hidden">Tiếp tục →</button>
          </div>
        )}
      </section>
    </main>
  );
}

function stars(correctFirst: number, exercises: number): number {
  if (exercises === 0) return 3;
  const r = correctFirst / exercises;
  return r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1;
}

function Finish({ title, xp, backHref, text, stars: n, speak: speakBtn }: { title: string; xp: number; backHref: string; text: string; stars: number; speak: React.ReactNode }) {
  return (
    <div className="rounded-blob bg-gradient-to-br from-sun/40 via-white to-sky/30 p-6 text-center shadow-soft ring-1 ring-brand/10">
      <h2 className="text-3xl font-extrabold">Hoàn thành “{title}”!</h2>
      <div className="mt-3 flex justify-center gap-2" aria-label={`${n} trên 3 sao`}>
        {[1, 2, 3].map((i) => (
          <Star key={i} aria-hidden size={48} className={i <= n ? "text-sun" : "text-ink/15"} fill="currentColor" />
        ))}
      </div>
      <div className="mt-3 text-xl"><Markdown text={text} /></div>
      <div className="mt-3 flex justify-center">{speakBtn}</div>
      <p className="mt-2 text-ink/60">+{xp} XP (chưa lưu — tính năng lưu tiến độ sẽ có sau)</p>
      <Link href={backHref} className="mt-5 inline-flex min-h-12 items-center rounded-xl bg-brand px-8 text-lg font-extrabold text-white shadow-soft">Về danh sách bài</Link>
    </div>
  );
}
