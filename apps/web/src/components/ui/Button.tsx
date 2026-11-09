import Link from "next/link";
import type { ComponentProps } from "react";

const tones = {
  orange:
    "bg-orange text-white shadow-[0_6px_0_#c96208] active:shadow-[0_2px_0_#c96208] hover:brightness-105",
  blue: "bg-brand text-white shadow-[0_6px_0_#08479b] active:shadow-[0_2px_0_#08479b] hover:brightness-110",
  white:
    "bg-white text-brand shadow-[0_6px_0_#cfe0f7] active:shadow-[0_2px_0_#cfe0f7] hover:bg-cloud",
  ghost: "bg-white/70 text-brand ring-2 ring-brand/20 hover:bg-white shadow-none",
} as const;

type Props = ComponentProps<typeof Link> & { tone?: keyof typeof tones; size?: "md" | "lg" };

/** Nút "kẹo" 3D, vùng chạm >= 48px */
export function ButtonLink({ tone = "orange", size = "md", className = "", ...rest }: Props) {
  const pad = size === "lg" ? "px-8 py-4 text-xl" : "px-6 py-3 text-lg";
  return (
    <Link
      {...rest}
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl font-display font-bold transition active:translate-y-1 ${pad} ${tones[tone]} ${className}`}
    />
  );
}
