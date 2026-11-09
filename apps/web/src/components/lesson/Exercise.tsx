"use client";

import { useState } from "react";
import { Check, Lightbulb, X } from "lucide-react";
import { call } from "@/lib/client-api";
import { blockSegments, optionSegment, type Lang, type Segment } from "@/lib/narration";
import { speak, useAutoRead } from "@/lib/speech";
import { Markdown } from "./Markdown";
import { SpeakButton } from "./SpeakButton";

type Option = { id: string; text: string; say?: string; lang?: Lang };

export type ExerciseBlock = {
  id: string;
  kind: string;
  prompt: string;
  lang?: Lang;
  option_lang?: Lang;
  listen?: { text: string; lang?: Lang };
  hint?: string;
  options?: Option[];
  left?: string[];
  right?: string[];
};

type Verdict = { correct: boolean; explanation: string };

/** Một bài tập. onDone(đúng ngay lần đầu?) được gọi khi học sinh bấm "Tiếp tục". */
export function Exercise({ lessonSlug, block, onDone }: { lessonSlug: string; block: ExerciseBlock; onDone: (firstTry: boolean) => void }) {
  const [selected, setSelected] = useState<string[]>([]); // mcq / order
  const [text, setText] = useState(""); // fill_blank
  const [pairs, setPairs] = useState<Record<string, string>>({}); // match: left -> right
  const [pickedLeft, setPickedLeft] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [tries, setTries] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [autoRead] = useAutoRead();

  const kind = block.kind;
  const lang: Lang = block.lang === "en" ? "en" : "vi";
  const optLang: Lang = block.option_lang === "en" ? "en" : block.option_lang === "vi" ? "vi" : lang;
  const supported = ["mcq", "listen_choose", "fill_blank", "order", "match"].includes(kind);
  const options = block.options ?? [];

  const say = (s: Segment[]) => speak(s);
  const sayOption = (o: Option) => say([optionSegment(o.text, o.lang ?? optLang, o.say)]);
  const sayText = (t: string, l: Lang = optLang) => say([optionSegment(t, l)]);
  const promptSegments = blockSegments({ type: "exercise", ...block });

  const response = (): Record<string, unknown> | null => {
    if (kind === "mcq" || kind === "listen_choose") return selected.length ? { selected } : null;
    if (kind === "fill_blank") return text.trim() ? { text } : null;
    if (kind === "order") return selected.length === options.length ? { sequence: selected } : null;
    if (kind === "match") return Object.keys(pairs).length === (block.left?.length ?? 0) ? { pairs: Object.entries(pairs) } : null;
    return null;
  };
  const ready = response() !== null;

  async function check() {
    const r = response();
    if (!r || busy) return;
    setBusy(true);
    setError("");
    const res = await call<Verdict>("POST", `/lessons/${encodeURIComponent(lessonSlug)}/check`, { block_id: block.id, response: r });
    setBusy(false);
    if (!res.ok) return setError(res.message);
    setTries((n) => n + 1);
    setVerdict(res.data);
    if (autoRead) {
      say([
        { text: res.data.correct ? "Giỏi lắm! Đúng rồi." : "Chưa đúng, bé thử lại nhé.", lang: "vi" },
        ...(res.data.correct && res.data.explanation ? blockSegments({ say: res.data.explanation }) : []),
      ]);
    }
  }

  function retry() {
    setVerdict(null);
    setSelected([]);
    setText("");
    setPairs({});
    setPickedLeft(null);
    say(promptSegments);
  }

  const locked = verdict?.correct === true;

  if (!supported) {
    return (
      <div className="rounded-blob bg-white p-5 ring-1 ring-ink/10">
        <p>Dạng bài này sắp có. Bé bấm tiếp tục nhé!</p>
        <button type="button" onClick={() => onDone(true)} className="mt-3 min-h-12 rounded-xl bg-brand px-6 font-extrabold text-white">Tiếp tục</button>
      </div>
    );
  }

  const choiceBtn = (active: boolean) =>
    `min-h-14 rounded-2xl px-5 text-2xl font-extrabold ring-2 transition disabled:opacity-60 ${
      active ? "bg-brand text-white ring-brand" : "bg-white ring-ink/10 hover:bg-cloud"
    }`;

  return (
    <div className="rounded-blob bg-white p-5 shadow-soft ring-1 ring-brand/10 sm:p-6">
      <div className="flex items-start gap-3">
        <SpeakButton segments={promptSegments} label="Nghe câu hỏi" className="shrink-0" />
        <div className="min-w-0 flex-1 text-xl font-bold"><Markdown text={block.prompt} /></div>
      </div>

      <div className="mt-5">
        {(kind === "mcq" || kind === "listen_choose") && (
          <div className="flex flex-wrap gap-3" role="group" aria-label="Các đáp án">
            {options.map((o) => (
              <button key={o.id} type="button" disabled={locked} aria-pressed={selected.includes(o.id)}
                onClick={() => { setSelected([o.id]); sayOption(o); }} className={choiceBtn(selected.includes(o.id))}>
                {o.text}
              </button>
            ))}
          </div>
        )}

        {kind === "fill_blank" && (
          <input
            value={text}
            disabled={locked}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && check()}
            aria-label="Câu trả lời của bé"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="min-h-14 w-40 rounded-2xl bg-cream px-4 text-center text-3xl font-extrabold ring-2 ring-ink/15 focus:ring-brand"
          />
        )}

        {kind === "order" && (
          <div>
            <p className="mb-2 text-ink/70">Bấm lần lượt theo đúng thứ tự:</p>
            <div className="flex flex-wrap gap-3">
              {options.map((o) => {
                const pos = selected.indexOf(o.id);
                return (
                  <button key={o.id} type="button" disabled={locked || pos >= 0}
                    onClick={() => { setSelected((s) => [...s, o.id]); sayOption(o); }} className={choiceBtn(pos >= 0)}>
                    {pos >= 0 && <span className="mr-2 text-base">{pos + 1}.</span>}{o.text}
                  </button>
                );
              })}
            </div>
            {selected.length > 0 && !locked && (
              <button type="button" onClick={() => setSelected([])} className="mt-3 min-h-11 rounded-xl px-3 font-bold text-brand underline">Chọn lại</button>
            )}
          </div>
        )}

        {kind === "match" && (
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div className="space-y-3">
              {(block.left ?? []).map((l) => (
                <button key={l} type="button" disabled={locked} aria-pressed={pickedLeft === l}
                  onClick={() => { setPickedLeft(l); sayText(l); }} className={`w-full ${choiceBtn(pickedLeft === l || (!!pairs[l] && pickedLeft === null))}`}>
                  {l}{pairs[l] && <span className="ml-2 text-base">→</span>}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {(block.right ?? []).map((r) => {
                const takenBy = Object.keys(pairs).find((k) => pairs[k] === r);
                return (
                  <button key={r} type="button" disabled={locked || !pickedLeft}
                    onClick={() => {
                      if (!pickedLeft) return;
                      setPairs((p) => {
                        const next = { ...p };
                        for (const k of Object.keys(next)) if (next[k] === r) delete next[k];
                        next[pickedLeft] = r;
                        return next;
                      });
                      setPickedLeft(null);
                      if (/\p{L}/u.test(r)) sayText(r, "vi"); // cột phải chỉ có hình/biểu tượng: không đọc
                    }}
                    className={`w-full text-lg ${choiceBtn(!!takenBy)}`}>
                    {r}{takenBy && <span className="ml-2 text-base">({takenBy})</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {block.hint && !locked && (
        <div className="mt-4">
          <button type="button" onClick={() => { setShowHint(true); say(blockSegments({ say: block.hint })); }}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 font-bold text-orange hover:bg-sun/20">
            <Lightbulb aria-hidden size={18} /> Gợi ý
          </button>
          {showHint && <p className="mt-1 rounded-xl bg-sun/25 px-4 py-2">{block.hint}</p>}
        </div>
      )}

      <div aria-live="polite" className="mt-4 min-h-6">
        {error && <p role="alert" className="font-bold text-berry">{error}</p>}
        {verdict && (
          <p className={`flex items-start gap-2 rounded-xl px-4 py-3 font-bold ${verdict.correct ? "bg-grass/20 text-green-900" : "bg-berry/15 text-berry"}`}>
            {verdict.correct ? <Check aria-hidden className="mt-1 shrink-0" size={20} /> : <X aria-hidden className="mt-1 shrink-0" size={20} />}
            <span>
              {verdict.correct ? "Giỏi lắm! Đúng rồi." : "Chưa đúng, bé thử lại nhé."}
              {verdict.correct && verdict.explanation && <span className="block font-normal text-ink/80">{verdict.explanation}</span>}
            </span>
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {!verdict && (
          <button type="button" onClick={check} disabled={!ready || busy}
            className="min-h-12 rounded-xl bg-brand px-8 text-lg font-extrabold text-white shadow-soft disabled:opacity-50">
            {busy ? "Đang chấm…" : "Kiểm tra"}
          </button>
        )}
        {verdict && !verdict.correct && (
          <button type="button" onClick={retry} className="min-h-12 rounded-xl bg-sun px-8 text-lg font-extrabold shadow-soft">Thử lại</button>
        )}
        {locked && (
          <button type="button" onClick={() => onDone(tries === 1)} autoFocus
            className="min-h-12 rounded-xl bg-grass px-8 text-lg font-extrabold text-white shadow-soft">Tiếp tục</button>
        )}
      </div>
    </div>
  );
}
