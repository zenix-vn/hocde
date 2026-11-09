import { AVATARS } from "@/lib/profiles";

export function Avatar({ avatarKey, size = "md" }: { avatarKey: string; size?: "sm" | "md" | "lg" }) {
  const a = AVATARS[avatarKey] ?? AVATARS.fox;
  const dims = { sm: "size-10 text-2xl", md: "size-16 text-4xl", lg: "size-24 text-6xl" }[size];
  return (
    <span role="img" aria-label={a.label} className={`grid shrink-0 place-items-center rounded-full ring-4 ring-white shadow-md ${a.bg} ${dims}`}>
      {a.emoji}
    </span>
  );
}
