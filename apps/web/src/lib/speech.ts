"use client";

import { useSyncExternalStore } from "react";
import type { Lang, Segment } from "./narration";
import { rankVoices } from "./voices";

const LOCALE: Record<Lang, string> = { vi: "vi-VN", en: "en-US" };
const RATE = 0.75; // đọc chậm cho bé mới học chữ
const PITCH = 1.05; // hơi cao một chút cho giọng thân thiện

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function synth(): SpeechSynthesis | null {
  try {
    return typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  } catch {
    return null;
  }
}

// ----- Giọng đọc: phụ huynh chọn được; mặc định tự chọn giọng nữ/tự nhiên tốt nhất của thiết bị -----
const voiceKey = (lang: Lang) => `hd_voice_${lang}`;

function savedVoice(lang: Lang): string | null {
  try {
    return window.localStorage.getItem(voiceKey(lang));
  } catch {
    return null;
  }
}

function pickVoice(s: SpeechSynthesis, lang: Lang): SpeechSynthesisVoice | undefined {
  const ranked = rankVoices(s.getVoices(), lang);
  const saved = savedVoice(lang);
  return ranked.find((v) => v.voiceURI === saved) ?? ranked[0];
}

/** Đọc lần lượt các đoạn (mỗi đoạn có ngôn ngữ riêng). Gọi lại sẽ ngắt lời đang đọc. */
export function speak(segments: Segment[]): void {
  const s = synth();
  if (!s || segments.length === 0) return;
  try {
    s.cancel();
    for (const seg of segments) {
      if (!seg.text.trim()) continue;
      const u = new SpeechSynthesisUtterance(seg.text);
      u.lang = LOCALE[seg.lang];
      u.rate = RATE;
      u.pitch = PITCH;
      const v = pickVoice(s, seg.lang);
      if (v) u.voice = v;
      s.speak(u);
    }
  } catch {
    /* trình duyệt không cho phát: bỏ qua, bé vẫn học được qua chữ */
  }
}

export function stopSpeaking(): void {
  try {
    synth()?.cancel();
  } catch {
    /* bỏ qua */
  }
}

function subscribeVoices(cb: () => void) {
  const s = synth();
  s?.addEventListener?.("voiceschanged", cb);
  listeners.add(cb);
  return () => {
    s?.removeEventListener?.("voiceschanged", cb);
    listeners.delete(cb);
  };
}

/** Máy có giọng đọc cho ngôn ngữ này không? null = chưa biết (danh sách giọng nạp bất đồng bộ). */
export function useHasVoice(lang: Lang): boolean | null {
  const snap = useSyncExternalStore(
    subscribeVoices,
    () => {
      const s = synth();
      if (!s) return "none";
      if (s.getVoices().length === 0) return "unknown";
      return rankVoices(s.getVoices(), lang).length > 0 ? "yes" : "no";
    },
    () => "unknown",
  );
  return snap === "yes" ? true : snap === "unknown" ? null : false;
}

export type VoiceChoice = { uri: string; name: string };

/** Danh sách giọng của ngôn ngữ (tốt nhất đứng đầu) và giọng đang dùng. */
export function useVoiceChoices(lang: Lang): { voices: VoiceChoice[]; current: string } {
  const snap = useSyncExternalStore(
    subscribeVoices,
    () => {
      const s = synth();
      if (!s) return "";
      const ranked = rankVoices(s.getVoices(), lang);
      const current = pickVoice(s, lang)?.voiceURI ?? "";
      return JSON.stringify({ current, voices: ranked.map((v) => ({ uri: v.voiceURI, name: v.name })) });
    },
    () => "",
  );
  return snap ? JSON.parse(snap) : { voices: [], current: "" };
}

const SAMPLE: Record<Lang, string> = { vi: "Xin chào bé yêu!", en: "Hello!" };

export function chooseVoice(lang: Lang, uri: string): void {
  try {
    window.localStorage.setItem(voiceKey(lang), uri);
  } catch {
    /* chế độ riêng tư: chỉ áp dụng cho phiên này */
  }
  notify();
  speak([{ text: SAMPLE[lang], lang }]);
}

// ----- Tuỳ chọn "Tự động đọc" (lưu trên thiết bị, mặc định BẬT vì bé chưa đọc được chữ) -----
const KEY = "hd_autoread";

function readPref(): boolean {
  try {
    return window.localStorage.getItem(KEY) !== "0";
  } catch {
    return true;
  }
}

export function useAutoRead(): [boolean, (v: boolean) => void] {
  const on = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    readPref,
    () => true,
  );
  const set = (v: boolean) => {
    try {
      window.localStorage.setItem(KEY, v ? "1" : "0");
    } catch {
      /* chế độ riêng tư: chỉ áp dụng cho phiên này */
    }
    if (!v) stopSpeaking();
    notify();
  };
  return [on, set];
}
