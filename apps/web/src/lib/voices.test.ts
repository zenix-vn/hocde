import assert from "node:assert/strict";
import { test } from "node:test";
import { rankVoices, voiceScore } from "./voices.ts";

const V = (name: string, lang = "vi-VN", localService = true) => ({ name, lang, localService });

test("ưu tiên giọng nữ neural (Edge HoaiMy) hơn giọng nam và giọng máy", () => {
  const ranked = rankVoices(
    [V("Microsoft An - Vietnamese (Vietnam)"), V("Microsoft NamMinh Online (Natural) - Vietnamese (Vietnam)", "vi-VN", false), V("Microsoft HoaiMy Online (Natural) - Vietnamese (Vietnam)", "vi-VN", false)],
    "vi",
  );
  assert.match(ranked[0].name, /HoaiMy/);
  assert.match(ranked[ranked.length - 1].name, /NamMinh/);
});

test("Linh (Apple) và Google Tiếng Việt được coi là giọng nữ", () => {
  assert.ok(voiceScore(V("Linh"), "vi") > voiceScore(V("Giọng lạ"), "vi"));
  assert.ok(voiceScore(V("Google Tiếng Việt"), "vi") > voiceScore(V("Giọng lạ"), "vi"));
});

test("chỉ giữ giọng đúng ngôn ngữ", () => {
  const ranked = rankVoices([V("Zira", "en-US"), V("Linh", "vi-VN"), V("Mai", "vi_VN")], "vi");
  assert.deepEqual(ranked.map((v) => v.name), ["Linh", "Mai"]);
});

test("'Female' không bị nhầm thành giọng nam", () => {
  assert.ok(voiceScore(V("Google UK English Female", "en-GB"), "en") > voiceScore(V("Google UK English Male", "en-GB"), "en"));
});

test("điểm bằng nhau giữ nguyên thứ tự gốc", () => {
  assert.deepEqual(rankVoices([V("A"), V("B")], "vi").map((v) => v.name), ["A", "B"]);
});

test("không có giọng nào → mảng rỗng", () => {
  assert.deepEqual(rankVoices([V("Zira", "en-US")], "vi"), []);
});
