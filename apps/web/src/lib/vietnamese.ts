// Ghép âm đầu + vần + thanh điệu thành tiếng Việt.

export const TONE_MARKS: Record<string, string> = {
  ngang: "",
  huyền: "̀",
  sắc: "́",
  hỏi: "̉",
  ngã: "̃",
  nặng: "̣",
};

const VOWELS = "aăâeêioôơuưy";
const MODIFIED = "ăâêôơư";

/** Gỡ dấu thanh (nếu có) khỏi một ký tự nguyên âm, giữ lại dấu mũ/móc/trăng. */
function stripTone(ch: string): string {
  return ch.normalize("NFD").replace(/[̣̀́̉̃]/g, "").normalize("NFC");
}

/**
 * Chọn nguyên âm mang dấu thanh trong vần:
 * 1. Có nguyên âm có dấu phụ (ă â ê ô ơ ư) → đặt ở đó (nếu nhiều thì lấy cái cuối: ươ→ơ, iê→ê, uô→ô).
 * 2. Chỉ một nguyên âm → đặt ở đó.
 * 3. Vần có âm cuối (an, oan, ...) → nguyên âm cuối cùng.
 * 4. oa, oe, uy kết thúc bằng nguyên âm → đặt ở nguyên âm thứ hai (cách viết "hoà", "thuý").
 * 5. Còn lại (ai, ao, ia, ua, ...) → nguyên âm đầu.
 * Lưu ý: quy tắc 4 là một lựa chọn chính tả; đổi nếu sách giáo khoa dùng "hòa/thúy".
 */
function toneIndex(rhyme: string): number {
  const chars = [...rhyme];
  const vowelIdx = chars.map((c, i) => (VOWELS.includes(stripTone(c).toLowerCase()) ? i : -1)).filter((i) => i >= 0);
  if (vowelIdx.length === 0) return -1;
  const modified = vowelIdx.filter((i) => MODIFIED.includes(stripTone(chars[i]).toLowerCase()));
  if (modified.length > 0) return modified[modified.length - 1];
  if (vowelIdx.length === 1) return vowelIdx[0];
  const endsWithVowel = vowelIdx[vowelIdx.length - 1] === chars.length - 1;
  if (!endsWithVowel) return vowelIdx[vowelIdx.length - 1];
  const pair = chars.map(stripTone).join("").toLowerCase();
  if (/(oa|oe|uy)$/.test(pair)) return vowelIdx[1];
  return vowelIdx[0];
}

export function composeSyllable(onset: string, rhyme: string, tone: string): string {
  const mark = TONE_MARKS[tone] ?? "";
  const base = [...rhyme.normalize("NFC")];
  if (mark) {
    const i = toneIndex(rhyme.normalize("NFC"));
    if (i >= 0) base[i] = (stripTone(base[i]).normalize("NFD") + mark).normalize("NFC");
  }
  return (onset + base.join("")).normalize("NFC");
}
