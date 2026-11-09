# 07. Bài học tương tác & định dạng nội dung

## 1. Mô hình nội dung
Bài học = danh sách **block** có thứ tự, lưu trong `lessons.content` (JSONB).

```json
{
  "schema": 1,
  "blocks": [
    { "id": "b1", "type": "mascot_say", "mascot": "fox", "mood": "happy",
      "text": "Chào bạn! Hôm nay mình học cộng có nhớ nhé!", "audio": "media:uuid" },
    { "id": "b2", "type": "interactive", "kind": "counters",
      "config": { "a": 7, "b": 5, "groupSize": 10, "caption": "Kéo 5 viên bi sang nhóm 7" } },
    { "id": "b3", "type": "text", "markdown": "7 + 3 = 10, còn thừa **2** nữa → **12**" },
    { "id": "b4", "type": "exercise", "kind": "mcq", "points": 10, "skill": "cong-co-nho",
      "prompt": "7 + 5 = ?",
      "options": [{"id":"a","text":"11"},{"id":"b","text":"12"},{"id":"c","text":"13"}],
      "answer": { "correct": ["b"] },
      "hint": "Thử gom đủ 10 trước nhé!",
      "explanation": "7 + 3 = 10, thêm 2 nữa là 12." }
  ]
}
```
- `answer`/`explanation` được **tách ra** khi trả cho client (xem 03/04).
- Mỗi block có `id` ổn định để lưu tiến độ và thống kê.
- Có JSON Schema (`content/schema/lesson.v1.schema.json`) để CMS & API validate.

## 2. Các loại block hiển thị
| type | Mô tả |
|---|---|
| `mascot_say` | Linh vật nói (bong bóng + audio) |
| `text` | Markdown (hỗ trợ KaTeX cho công thức, ruby cho phiên âm) |
| `image` / `gallery` | Ảnh có chú thích, phóng to |
| `video` | Video ngắn (HLS/MP4) hoặc YouTube-nocookie |
| `audio` | Phát âm, bài đọc; có tô sáng theo thời gian (`timings`) |
| `callout` | Ghi nhớ / Mẹo / Lưu ý (khung màu) |
| `steps` | Giải thích từng bước, bấm để hiện bước kế |
| `interactive` | Mô phỏng (xem mục 4) |
| `code_demo` | Ví dụ code có giải thích từng dòng, bấm "Chạy" |
| `exercise` | Bài tập (mục 3) |
| `summary` | Tổng kết bài |

## 2b. Phát âm cho lớp 1–2 (bé chưa đọc được chữ)
Trình phát **tự động đọc** từng màn (giọng của trình duyệt, tuỳ chọn Bật/Tắt trên thiết bị), mỗi khối có nút loa để nghe lại; chạm đáp án cũng nghe được. Tác giả không cần làm gì thêm cho phần lớn nội dung, vì:
- chữ cái in đậm `**b**`, hoặc sau "chữ/âm", hoặc đứng cạnh `+`, `_` được đọc theo **âm** ("bờ"), không phải tên chữ ("bê");
- phép tính được đọc thành lời (`7 + 5 = ?` → "7 cộng 5 bằng mấy", `_` → "chỗ trống"); emoji bị bỏ qua.

Trường tuỳ chọn trên block:
| Trường | Ý nghĩa |
|---|---|
| `lang: vi\|en` | Ngôn ngữ của block (mặc định `vi`) |
| `say` | Thay lời đọc tự động: chuỗi, hoặc danh sách đoạn `[{t: "Con mèo là", l: vi}, {t: "cat", l: en}]` (dùng cho bài song ngữ) |
| `option_lang` | Ngôn ngữ của các đáp án (VD `en` khi đáp án là từ tiếng Anh) |
| `options[].say` / `options[].lang` | Lời đọc riêng cho một đáp án (VD đáp án là emoji 🐱 → `say: cat`, `lang: en`) |
| `listen: {text, lang}` | Với `listen_choose`: từ cần nghe (đọc sau câu hỏi) |

Mô phỏng mới: `counters` (chạm từng vật để đếm, máy đọc số) và `flashcards` (chạm thẻ để nghe từ + nghĩa).
Kiểm thử quy tắc đọc: `pnpm test` trong `apps/web`. Nếu thiết bị không có giọng tiếng Việt, trình phát hiện thông báo cho phụ huynh.

## 3. Dạng bài tập (exercise.kind)
| kind | Ví dụ | Đáp án lưu |
|---|---|---|
| `mcq` | Chọn 1/nhiều đáp án (có ảnh) | `correct: [ids]` |
| `true_false` | Đúng/Sai | `correct: bool` |
| `fill_blank` | Điền từ/số vào chỗ trống | `accept: ["12","mười hai"]` |
| `number_input` | Nhập số (hỗ trợ sai số, phân số) | `value`, `tolerance` |
| `match` | Nối cặp (từ–hình, phép tính–kết quả) | `pairs` |
| `order` | Sắp xếp (các từ thành câu, các bước) | `sequence` |
| `drag_drop` | Kéo vào ô/phân loại | `mapping` |
| `hotspot` | Chạm vào vị trí trên hình | `regions` |
| `typing` | Gõ chữ (tập gõ, chính tả) | `text` + chuẩn hoá dấu |
| `speak` | Đọc to (Web Speech API, so khớp mềm) | `target`, `threshold` |
| `listen_choose` | Nghe rồi chọn (Tiếng Anh) | giống mcq |
| `draw_trace` | Tập viết chữ/số bằng cách tô nét | `strokes` (độ lệch cho phép) |
| `code` | Viết code Python, chạy test | `tests[]` |

Quy ước chấm: chuẩn hoá chuỗi (trim, hạ chữ thường, bỏ dấu cách thừa, tuỳ chọn bỏ dấu tiếng Việt cho lớp nhỏ), `tolerance` cho số, thứ tự tuỳ chọn.

## 4. Mô phỏng trực quan (`interactive.kind`)
**Toán**: `counters` (viên bi/que tính), `number_line`, `abacus`/`base10_blocks` (hàng trăm-chục-đơn vị), `clock`, `fraction_pie`, `multiplication_grid`, `shape_builder`, `angle_protractor`, `coordinate_plane`, `function_plotter` (THCS).
**Tiếng Việt**: `syllable_builder` (ghép âm đầu + vần + thanh), `read_along` (tô sáng theo giọng), `word_sort`, `sentence_builder`, `handwriting`.
**Tiếng Anh**: `flashcards` (lật thẻ + phát âm), `picture_dictionary`, `dialogue` (hội thoại chọn lời), `spelling_bee`.
**Python**: `turtle` (vẽ hình bằng code), `variable_box` (hộp biến minh hoạ gán giá trị), `loop_visualizer`, `list_viz`, `flowchart`.

Mỗi mô phỏng là React component độc lập nhận `config` (JSON) và phát sự kiện `onComplete`/`onInteract`. Đăng ký trong `interactiveRegistry`.

## 5. Python Learning Runner (chạy trên trình duyệt)

```
CodeExercise ──► CodeEditor (CodeMirror)
      │ Chạy / Nộp
      ▼
  python.worker.ts  ── Pyodide (WASM) ── stdout/stderr, turtle → canvas
```

- **Pyodide trong Web Worker**; giới hạn thời gian chạy (timeout 5s → `worker.terminate()` và khởi tạo lại) để chống vòng lặp vô hạn.
- Tắt `import` nguy hiểm: chỉ cho phép whitelist (`math`, `random`, `turtle`(shim), `datetime`…). Không có mạng/file thật.
- **Test case**: mỗi test `{ "input": "5\n", "expected_output": "25", "hidden": false }`; hoặc kiểm tra hàm: `{ "call": "square(5)", "expected": 25 }`.
- Thông báo lỗi **thân thiện**: dịch `SyntaxError`, `NameError`, `IndentationError` sang tiếng Việt kèm gợi ý và chỉ dòng lỗi.
- Gợi ý theo cấp (hint 1, 2, 3), nút "Xem lời giải" sau N lần thử.
- `turtle`: shim vẽ lên `<canvas>` (con rùa dễ thương) – rất hấp dẫn với trẻ.

Ví dụ block:
```json
{ "id":"c1","type":"exercise","kind":"code","points":20,
  "prompt":"Viết chương trình in ra: Xin chào!",
  "starter":"# Viết code ở đây\n",
  "tests":[{"input":"","expected_output":"Xin chào!"}],
  "hints":["Dùng lệnh print()","print(\"...\") – nhớ dấu ngoặc kép"],
  "solution":"print(\"Xin chào!\")" }
```

## 6. Quy trình soạn nội dung
1. Biên tập viên soạn trong **CMS** (kéo-thả block, xem trước theo từng cấp lớp) hoặc viết YAML trong `content/` rồi chạy `make content-import`.
2. Trạng thái: `draft → review → published`. Người duyệt kiểm tra chính tả/sư phạm.
3. Publish → API đồng bộ `exercises`, xoá cache, gọi `revalidate` của Next.js.
4. Checklist một bài tốt: ≤10 phút; 1 mục tiêu học; ≥1 mô phỏng trực quan; 5–8 bài tập tăng dần; có giải thích khi sai; có audio cho lớp 1–3.

## 7. Cấu trúc thư mục `content/` (git)
```
content/
├── schema/lesson.v1.schema.json
├── toan/lop-2/chuong-01-cong-tru/bai-01-cong-co-nho.yaml
├── tieng-viet/lop-1/...
├── tieng-anh/lop-3/...
├── python/co-ban/bai-01-in-ra-man-hinh.yaml
└── assets/ (ảnh, audio nguồn)
```

## 8. Ví dụ mẫu nội dung MVP
- **Toán 1–2**: Đếm đến 20, So sánh số, Cộng/trừ trong 10 và 20 (que tính/trục số), Cộng có nhớ, Đồng hồ.
- **Tiếng Việt 1**: Chữ cái & âm, Ghép vần, Tập đọc câu ngắn, Tập viết.
- **Tiếng Anh 3**: Greetings, Colors, Animals, Numbers (flashcard + nghe-chọn).
- **Python cơ bản (lớp 6+)**: print, biến, kiểu dữ liệu, input, if/else, vòng lặp for/while, list, hàm, turtle.
