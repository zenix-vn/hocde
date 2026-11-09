// Chuyển nội dung bài học thành lời đọc cho bé chưa biết đọc. Thuần logic, không phụ thuộc trình duyệt.

export type Lang = "vi" | "en";
export type Segment = { text: string; lang: Lang };

/** Âm của phụ âm khi bé học chữ (đọc "bờ", không phải tên chữ "bê"). Nguyên âm đọc như chính nó. */
const PHONICS: Record<string, string> = {
  b: "bờ", c: "cờ", d: "dờ", đ: "đờ", g: "gờ", h: "hờ", k: "ca", l: "lờ", m: "mờ",
  n: "nờ", p: "pờ", q: "cu", r: "rờ", s: "sờ", t: "tờ", v: "vờ", x: "xờ",
};

export function phonics(letter: string): string {
  return PHONICS[letter.toLowerCase()] ?? letter.toLowerCase();
}

const LETTER = "A-Za-zĐđ";

/** Một chữ cái đứng riêng (VD đáp án "b") → đọc theo âm. */
export function isSingleLetter(s: string): boolean {
  return new RegExp(`^[${LETTER}]$`).test(s.trim());
}

/**
 * Văn bản bài học → câu đọc. Quy tắc (chỉ tiếng Việt):
 * - **x** (một chữ cái in đậm) = âm đang học → đọc theo âm.
 * - "chữ x" / "âm x" với x là một chữ cái → đọc theo âm.
 * - "_" (chỗ trống) → "chỗ trống"; chữ cái sát dấu "_" đọc theo âm.
 * - Phép tính: + − × = > < ? được đọc thành lời.
 */
export function toSpeechText(raw: string, lang: Lang = "vi"): string {
  let t = raw;
  if (lang === "vi") {
    t = t.replace(new RegExp(`\\*\\*([${LETTER}])\\*\\*`, "g"), (_, l: string) => phonics(l));
  }
  t = t.replace(/\p{Extended_Pictographic}\uFE0F?/gu, " ").replace(/\*\*/g, "").replace(/^\s*[-•]\s+/gm, "").replace(/([.!?:;,])\s*\n+\s*/g, "$1 ").replace(/\s*\n+\s*/g, ". ");

  if (lang === "vi") {
    t = t.replace(new RegExp(`(^|\\s)(chữ|âm)\\s+([${LETTER}])(?![\\p{L}])`, "giu"), (_, a: string, w: string, l: string) => `${a}${w} ${phonics(l)}`);
    t = t.replace(new RegExp(`(^|[^\\p{L}])([${LETTER}])_`, "gu"), (_, a: string, l: string) => `${a}${phonics(l)} _`);
    t = t.replace(new RegExp(`_([${LETTER}])(?![\\p{L}])`, "gu"), (_, l: string) => `_ ${phonics(l)}`);
    t = t.replace(/_+/g, " chỗ trống ");
    // ghép chữ: "b + a" → "bờ cộng a" (chữ cái đứng cạnh dấu + đọc theo âm)
    t = t.replace(new RegExp(`(^|\\s)([${LETTER}])(?=\\s\\+\\s)`, "g"), (_, a: string, l: string) => `${a}${phonics(l)}`);
    t = t.replace(new RegExp(`(\\s\\+\\s)([${LETTER}])(?![\\p{L}])`, "gu"), (_, a: string, l: string) => `${a}${phonics(l)}`);
    t = t.replace(/\s\+\s/g, " cộng ");
    // phép tính
    t = t.replace(/=\s*\?/g, " bằng mấy ");
    t = t.replace(/(\d|chỗ trống)\s*\+\s*(?=\d|chỗ trống)/g, "$1 cộng ");
    t = t.replace(/(\d|chỗ trống)\s*[-−–]\s*(?=\d|chỗ trống)/g, "$1 trừ ");
    t = t.replace(/(\d|chỗ trống)\s*[×x*]\s*(?=\d|chỗ trống)/g, "$1 nhân ");
    t = t.replace(/\s*=\s*/g, " bằng ");
    t = t.replace(/\s*>\s*/g, " lớn hơn ");
    t = t.replace(/\s*<\s*/g, " bé hơn ");
  }
  return t.replace(/\s+/g, " ").replace(/\s+([.,!?])/g, "$1").trim();
}

const VI_NUMBERS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín", "mười",
  "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín", "hai mươi"];
const EN_NUMBERS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];

export function numberWord(n: number, lang: Lang = "vi"): string {
  return (lang === "en" ? EN_NUMBERS : VI_NUMBERS)[n] ?? String(n);
}

type Block = { type?: unknown; lang?: unknown; say?: unknown; [k: string]: unknown };

const asLang = (v: unknown): Lang => (v === "en" ? "en" : "vi");
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** Lấy phần `say` do tác giả khai báo (chuỗi hoặc danh sách đoạn {t, l}) để thay cho lời đọc tự động. */
function fromSay(say: unknown, lang: Lang): Segment[] | null {
  if (typeof say === "string" && say.trim()) return [{ text: toSpeechText(say, lang), lang }];
  if (Array.isArray(say)) {
    const out: Segment[] = [];
    for (const s of say) {
      if (s && typeof s === "object") {
        const o = s as { t?: unknown; l?: unknown };
        const l = asLang(o.l ?? lang);
        if (str(o.t).trim()) out.push({ text: toSpeechText(str(o.t), l), lang: l });
      }
    }
    return out.length ? out : null;
  }
  return null;
}

/** Lời đọc của một block (rỗng nếu block không cần đọc). */
export function blockSegments(block: Block): Segment[] {
  const lang = asLang(block.lang);
  const custom = fromSay(block.say, lang);
  if (custom) return custom;

  let text = "";
  switch (block.type) {
    case "mascot_say": text = str(block.text); break;
    case "text": case "callout": case "summary": text = str(block.markdown); break;
    case "interactive": text = str((block.config as { caption?: unknown } | undefined)?.caption); break;
    case "exercise": text = str(block.prompt); break;
  }
  const out: Segment[] = text.trim() ? [{ text: toSpeechText(text, lang), lang }] : [];

  // bài nghe-chọn: đọc thêm từ cần nghe (thường là tiếng Anh)
  const listen = block.listen as { text?: unknown; lang?: unknown } | undefined;
  if (block.type === "exercise" && listen && str(listen.text)) {
    out.push({ text: str(listen.text), lang: asLang(listen.lang ?? "en") });
  }
  return out;
}

/** Lời đọc của một đáp án/nhãn ngắn. */
export function optionSegment(text: string, lang: Lang, say?: string): Segment {
  if (say) return { text: toSpeechText(say, lang), lang };
  if (lang === "vi" && isSingleLetter(text)) return { text: phonics(text), lang };
  return { text: toSpeechText(text, lang), lang };
}
