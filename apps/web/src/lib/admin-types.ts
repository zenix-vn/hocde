// Kiểu dữ liệu & nhãn dùng chung cho khu vực quản trị (an toàn cho cả server lẫn client).

export type Meta = { page: number; page_size: number; total: number };

export const ROLE_LABEL: Record<string, string> = {
  parent: "Phụ huynh",
  teacher: "Giáo viên",
  editor: "Biên tập viên",
  admin: "Quản trị viên",
};

export const STATUS_LABEL: Record<string, string> = {
  draft: "Bản nháp",
  review: "Chờ duyệt",
  published: "Đã xuất bản",
  archived: "Lưu trữ",
};

export const STATUS_TONE: Record<string, string> = {
  draft: "bg-ink/10 text-ink/70",
  review: "bg-sun/30 text-[#7a5a00]",
  published: "bg-grass/20 text-[#17692c]",
  archived: "bg-berry/15 text-[#a02050]",
};

export type UserRow = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
  disabled_at: string | null;
  profiles: number;
};

export type ChildRow = {
  id: string;
  display_name: string;
  avatar_key: string;
  grade: number;
  total_xp: number;
  stars: number;
  level: number;
  current_streak: number;
  last_active_date: string | null;
  lessons_completed: number;
  created_at: string;
};

export type ProfileRow = ChildRow & { parent_id: string; parent_email: string; parent_name: string };

export type UserDetail = {
  user: UserRow;
  consent_at: string | null;
  consent_version: string | null;
  has_pin: boolean;
  google_linked: boolean;
  active_sessions: number;
  children: ChildRow[];
};

export type AuditRow = {
  id: number;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  meta: unknown;
  created_at: string;
};

export type Stats = {
  users: { total: number; parents: number; staff: number; disabled: number; new_7d: number; new_30d: number; profiles: number; active_profiles_7d: number };
  content: { courses: number; published_courses: number; lessons: number; published_lessons: number; draft_lessons: number; review_lessons: number; exercises: number };
  learning: { attempts_7d: number; accuracy_7d: number | null; completions_7d: number; minutes_7d: number };
  series: { day: string; signups: number; completions: number; attempts: number }[];
  top_lessons: { id: string; title: string; slug: string; count: number }[];
  hardest_lessons: { id: string; title: string; slug: string; count: number; rate: number }[];
};

export type Subject = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  color: string;
  icon_key: string;
  sort_order: number;
  is_active: boolean;
  courses: number;
};

export type Course = {
  id: string;
  subject_id: number;
  subject_slug: string;
  subject_name: string;
  grade: number;
  slug: string;
  title: string;
  summary: string | null;
  status: string;
  sort_order: number;
  units: number;
  lessons: number;
  published_lessons: number;
};

export type LessonBrief = {
  id: string;
  slug: string;
  title: string;
  status: string;
  est_minutes: number;
  xp_reward: number;
  sort_order: number;
  version: number;
  exercises: number;
  updated_at: string;
};

export type UnitFull = { id: string; slug: string; title: string; summary: string | null; sort_order: number; lessons: LessonBrief[] };

export type Block = { id: string; type: string; [k: string]: unknown };

export type LessonFull = {
  id: string;
  unit_id: string;
  unit_title: string;
  course_id: string;
  course_title: string;
  subject_slug: string;
  slug: string;
  title: string;
  summary: string | null;
  est_minutes: number;
  xp_reward: number;
  status: string;
  version: number;
  published_at: string | null;
  updated_at: string;
  content: { schema: number; blocks: Block[] };
  problems: string[];
};

/** Tạo slug không dấu từ tiêu đề tiếng Việt. */
export function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const TZ = "Asia/Ho_Chi_Minh";
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", { timeZone: TZ });
}
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("vi-VN", { timeZone: TZ, hour12: false });
}
