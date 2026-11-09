// Chạy: pnpm test   (dùng node:test có sẵn, không cần cài thêm thư viện)
import assert from "node:assert/strict";
import { test } from "node:test";
import { blockSegments, numberWord, optionSegment, toSpeechText as t } from "./narration.ts";

test("chữ cái in đậm và sau 'chữ/âm' đọc theo âm, không đọc tên chữ", () => {
  assert.equal(t("Chữ **B** có hai dạng: **B** in hoa, **b** in thường."), "Chữ bờ có hai dạng: bờ in hoa, bờ in thường.");
  assert.equal(t("Đâu là chữ **đ** in thường?"), "Đâu là chữ đờ in thường?");
  assert.equal(t("Hôm nay học chữ mới: chữ đ. Bé nghe"), "Hôm nay học chữ mới: chữ đờ. Bé nghe");
});

test("ghép chữ và chỗ trống", () => {
  assert.equal(t("Ghép b + a rồi thử."), "Ghép bờ cộng a rồi thử.");
  assert.equal(t("Điền phần còn thiếu để được tiếng **bò**: b_"), "Điền phần còn thiếu để được tiếng bò: bờ chỗ trống");
});

test("phép tính đọc thành lời", () => {
  assert.equal(t("7 + 5 = ?"), "7 cộng 5 bằng mấy");
  assert.equal(t("3 + 2 = _"), "3 cộng 2 bằng chỗ trống");
  assert.equal(t("2 + _ = 4"), "2 cộng chỗ trống bằng 4");
  assert.equal(t("9 - 4 = 5"), "9 trừ 4 bằng 5");
  assert.equal(t("2 × 3 = 6"), "2 nhân 3 bằng 6");
});

test("emoji không bị đọc thành tên", () => {
  assert.equal(t("Có bao nhiêu quả táo? 🍎🍎🍎"), "Có bao nhiêu quả táo?");
});

test("tiếng Anh giữ nguyên, không áp quy tắc phát âm tiếng Việt", () => {
  assert.equal(t("b", "en"), "b");
  assert.deepEqual(optionSegment("b", "en"), { text: "b", lang: "en" });
  assert.deepEqual(optionSegment("b", "vi"), { text: "bờ", lang: "vi" });
  assert.deepEqual(optionSegment("🐱", "en", "cat"), { text: "cat", lang: "en" });
});

test("say tự khai báo thay cho lời đọc tự động, hỗ trợ nhiều ngôn ngữ", () => {
  assert.deepEqual(
    blockSegments({ type: "text", markdown: "ignored", say: [{ t: "Con mèo là", l: "vi" }, { t: "cat", l: "en" }] }),
    [{ text: "Con mèo là", lang: "vi" }, { text: "cat", lang: "en" }],
  );
});

test("bài nghe-chọn đọc câu hỏi rồi từ cần nghe", () => {
  assert.deepEqual(
    blockSegments({ type: "exercise", prompt: "Nghe và chọn.", listen: { text: "cat", lang: "en" } }),
    [{ text: "Nghe và chọn.", lang: "vi" }, { text: "cat", lang: "en" }],
  );
});

test("số đếm", () => {
  assert.equal(numberWord(7), "bảy");
  assert.equal(numberWord(7, "en"), "seven");
  assert.equal(numberWord(10), "mười");
});
