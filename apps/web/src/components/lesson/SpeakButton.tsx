"use client";

import { Volume2 } from "lucide-react";
import type { Segment } from "@/lib/narration";
import { speak } from "@/lib/speech";

/** Nút loa lớn để nghe đọc lại (vùng chạm ≥ 48px). */
export function SpeakButton({ segments, label = "Nghe", className = "" }: { segments: Segment[]; label?: string; className?: string }) {
  if (segments.length === 0) return null;
  return (
    <button
      type="button"
      onClick={() => speak(segments)}
      aria-label={`${label} đọc`}
      className={`inline-flex min-h-12 min-w-12 items-center justify-center gap-2 rounded-full bg-grass px-4 font-extrabold text-white shadow-soft transition hover:brightness-105 active:scale-95 ${className}`}
    >
      <Volume2 aria-hidden size={24} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
