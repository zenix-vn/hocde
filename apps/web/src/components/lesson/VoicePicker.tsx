"use client";

import { chooseVoice, useVoiceChoices } from "@/lib/speech";

/** Chọn giọng đọc tiếng Việt (chỉ hiện khi thiết bị có từ 2 giọng trở lên). Giọng nữ/tự nhiên được chọn sẵn. */
export function VoicePicker() {
  const { voices, current } = useVoiceChoices("vi");
  if (voices.length < 2) return null;
  return (
    <label className="mt-3 flex flex-wrap items-center gap-2 text-base text-ink/70">
      <span className="font-bold">Giọng đọc:</span>
      <select
        value={current}
        onChange={(e) => chooseVoice("vi", e.target.value)}
        className="min-h-11 max-w-full rounded-xl bg-white px-3 font-bold ring-2 ring-ink/10"
      >
        {voices.map((v) => (
          <option key={v.uri} value={v.uri}>{v.name.replace(/^Microsoft\s+/i, "").replace(/\s*-\s*Vietnamese.*$/i, "")}</option>
        ))}
      </select>
    </label>
  );
}
