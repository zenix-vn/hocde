// Xếp hạng giọng đọc: ưu tiên giọng nữ, giọng "tự nhiên" (neural), tránh giọng nam. Thuần logic, không phụ thuộc trình duyệt.

export type VoiceInfo = { name: string; lang: string; localService?: boolean; voiceURI?: string };
export type VoiceLang = "vi" | "en";

// Tên giọng nữ phổ biến (so khớp không phân biệt hoa thường).
const FEMALE: Record<VoiceLang, string[]> = {
  vi: ["hoaimy", "hoai my", "linh", "google tiếng việt", "google vietnamese", "female", "nữ"],
  en: ["jenny", "aria", "samantha", "zira", "hazel", "susan", "karen", "libby", "sonia", "google us english", "google uk english female", "female"],
};
// Giọng nam đã biết, để tránh. (Không đoán giới tính với các tên không chắc chắn như "An".)
const MALE: Record<VoiceLang, string[]> = {
  vi: ["nammin", "nam minh", "nam "],
  en: ["david", "mark", "guy", "george", "daniel", "alex", "fred", "ryan", "google uk english male"],
};

const hasWord = (name: string, words: string[]) => words.some((w) => name.includes(w));

export function voiceScore(v: VoiceInfo, lang: VoiceLang): number {
  const name = v.name.toLowerCase();
  let score = 0;
  if (/natural|neural|online/.test(name)) score += 10; // giọng mạng/neural nghe tự nhiên hơn hẳn giọng máy
  if (hasWord(name, FEMALE[lang])) score += 8;
  // "female" chứa "male": chỉ tính là giọng nam khi không phải giọng nữ
  if (hasWord(name, MALE[lang]) || (/\bmale\b/.test(name) && !name.includes("female"))) score -= 20;
  if (v.localService) score += 1; // cùng chất lượng thì ưu tiên giọng cục bộ (phát nhanh, không cần mạng)
  return score;
}

const matches = (v: VoiceInfo, lang: VoiceLang) => v.lang.toLowerCase().replace("_", "-").startsWith(lang);

/** Các giọng đúng ngôn ngữ, giọng tốt nhất đứng đầu (thứ tự ổn định khi điểm bằng nhau). */
export function rankVoices<T extends VoiceInfo>(voices: T[], lang: VoiceLang): T[] {
  return voices
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => matches(v, lang))
    .sort((a, b) => voiceScore(b.v, lang) - voiceScore(a.v, lang) || a.i - b.i)
    .map(({ v }) => v);
}
