export type Profile = {
  id: string;
  display_name: string;
  avatar_key: string;
  grade: number;
  total_xp: number;
  stars: number;
  level: number;
  current_streak: number;
  daily_limit_minutes: number | null;
};

export const AVATARS: Record<string, { emoji: string; label: string; bg: string }> = {
  fox: { emoji: "🦊", label: "Cáo", bg: "bg-orange/25" },
  cat: { emoji: "🐱", label: "Mèo", bg: "bg-sun/40" },
  panda: { emoji: "🐼", label: "Gấu trúc", bg: "bg-sky/30" },
  rabbit: { emoji: "🐰", label: "Thỏ", bg: "bg-berry/20" },
  dino: { emoji: "🦖", label: "Khủng long", bg: "bg-grass/25" },
  owl: { emoji: "🦉", label: "Cú", bg: "bg-grape/20" },
  robot: { emoji: "🤖", label: "Robot", bg: "bg-brand/15" },
  unicorn: { emoji: "🦄", label: "Kỳ lân", bg: "bg-berry/25" },
};

export const MAX_PROFILES = 5;
