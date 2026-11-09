import "server-only";

const API = process.env.API_INTERNAL_URL ?? "http://localhost:8080";

export type LessonItem = { slug: string; title: string; summary: string | null; est_minutes: number; xp_reward: number };
export type UnitItem = { slug: string; title: string; summary: string | null; lessons: LessonItem[] };
export type CourseData = { title: string; summary: string | null; grade: number; units: UnitItem[] };

export type Block = { id: string; type: string; [key: string]: unknown };
export type LessonData = { slug: string; title: string; est_minutes: number; xp_reward: number; blocks: Block[] };

async function get<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}/api/v1${path}`, { cache: "no-store" });
    return res.ok ? ((await res.json()).data as T) : null;
  } catch {
    return null;
  }
}

export const getCourse = (subject: string, grade: number) => get<CourseData>(`/courses/${encodeURIComponent(subject)}/${grade}`);
export const getLesson = (slug: string) => get<LessonData>(`/lessons/${encodeURIComponent(slug)}`);
