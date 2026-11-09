# 06. UI/UX kiểu trẻ em – sáng sủa, vui nhộn

## 1. Nguyên tắc
1. **Sáng & ấm**: nền trắng kem/xanh trời nhạt, màu rực rỡ nhưng không chói.
2. **Tròn trịa**: bo góc lớn (16–28px), nút phồng như kẹo, không có góc nhọn.
3. **Ít chữ – nhiều hình**: mỗi màn một việc; câu ngắn; có icon + giọng đọc.
4. **Phản hồi tức thì**: mọi chạm đều có hiệu ứng (nảy, âm thanh, confetti).
5. **Không phạt nặng**: sai thì khích lệ ("Gần đúng rồi, thử lại nhé!"), không dùng đỏ gắt.
6. **Mục tiêu chạm lớn** ≥ 48×48px; khoảng cách rộng để trẻ nhỏ bấm chính xác.
7. **Linh vật đồng hành**: chú cáo **"Bi"** (hoặc nhóm bạn: cáo, mèo máy, rồng con) hướng dẫn, cổ vũ.

## 2. Bảng màu (Tailwind tokens)

| Token | Hex | Dùng cho |
|---|---|---|
| `sun` | `#FFC93C` | Nhấn chính, sao, CTA |
| `sky` | `#4CC9F0` | Nền phụ, Toán |
| `grass` | `#5BD66B` | Đúng, thành công, Tiếng Anh |
| `berry` | `#FF6B9D` | Tiếng Việt, yêu thích |
| `grape` | `#8E6CF0` | Python, huy hiệu |
| `orange` | `#FF9F45` | Sai nhẹ / cảnh báo mềm, streak 🔥 |
| `cream` | `#FFF9EC` | Nền trang |
| `ink` | `#2B2D42` | Chữ chính (không dùng đen tuyền) |
| `cloud` | `#EAF6FF` | Nền thẻ |

Màu theo môn: **Toán = sky**, **Tiếng Việt = berry**, **Tiếng Anh = grass**, **Python = grape**.

```ts
// tailwind.config.ts (trích)
theme: { extend: {
  colors: { sun:'#FFC93C', sky:'#4CC9F0', grass:'#5BD66B', berry:'#FF6B9D',
            grape:'#8E6CF0', orange:'#FF9F45', cream:'#FFF9EC', ink:'#2B2D42' },
  borderRadius: { blob: '28px' },
  boxShadow: {
    candy: '0 6px 0 0 rgba(0,0,0,.15)',          // nút 3D
    soft: '0 8px 24px rgba(76,201,240,.25)',
  },
  fontFamily: { display: ['var(--font-baloo)'], body: ['var(--font-nunito)'] },
}}
```

## 3. Typography
- **Tiêu đề**: *Baloo 2* (tròn, vui, hỗ trợ tiếng Việt đầy đủ dấu).
- **Nội dung**: *Nunito* (dễ đọc). Tuỳ chọn *Lexend* cho trẻ khó đọc.
- Cỡ chữ cơ bản 18px (lớp 1–3: 20–22px); line-height 1.6.
- Tập viết chữ: font nét chữ học sinh *"Be Vietnam Pro"* hoặc font tập viết có nét mẫu (SVG path).

## 4. Thành phần UI đặc trưng

**Nút "kẹo" 3D**
```css
.btn-candy { @apply rounded-2xl px-6 py-3 font-display text-lg text-white
  bg-grass shadow-[0_6px_0_#3aa84a] active:translate-y-1 active:shadow-[0_2px_0_#3aa84a]
  transition-transform; }
```
- **Thẻ môn học**: khối màu lớn, icon hoạt hình, bo tròn, hover nhún nhẹ.
- **Bản đồ học tập**: đường uốn lượn với các "trạm" tròn (bài học) – sao dưới mỗi trạm, bài khoá có ổ khoá, bài hiện tại nhấp nháy + linh vật đứng cạnh (như Duolingo/đảo kho báu). Mỗi chương là một "vùng" chủ đề (Rừng số, Đảo chữ, Thành phố Python).
- **Thanh trên cùng**: 🔥 streak · ⭐ sao · ⚡ XP · avatar.
- **Thanh điều hướng dưới** (mobile): Học · Ôn tập · Thành tích · Hồ sơ.
- **Panel phản hồi**: trượt từ dưới lên, xanh lá (đúng) / cam (sai) + câu khích lệ ngẫu nhiên.

## 5. Chuyển động & âm thanh
- Framer Motion: spring nảy khi chọn đáp án, lắc nhẹ khi sai, sao bay vào thanh XP.
- Lottie cho linh vật (vui, nhảy, buồn, suy nghĩ, ngủ).
- `canvas-confetti` khi hoàn thành bài.
- Âm thanh ngắn (<1s), âm lượng thấp, nút bật/tắt; tôn trọng `prefers-reduced-motion`.

## 6. Bố cục theo độ tuổi
| Nhóm | Điều chỉnh |
|---|---|
| Lớp 1–3 | Chữ rất lớn, nhiều hình, đọc to tự động, ít lựa chọn (2–3), kéo-thả đơn giản |
| Lớp 4–5 | Cân bằng hình/chữ, 4 lựa chọn, bài tập nhiều bước |
| THCS (6–9) | Màu dịu hơn một chút, giao diện gọn, ít hoạt hình trẻ con, tăng độ dài chữ, mô-đun code/biểu đồ — vẫn tươi sáng |

Giao diện đọc `grade` của hồ sơ để chọn **theme** (`kid` / `tween`): đổi cỡ chữ, mật độ, mức độ linh vật.

## 7. Wireframe (ASCII)

**Trang chủ học sinh**
```
┌──────────────────────────────────────────┐
│ 🦊 Bi   🔥5   ⭐128   ⚡560      (Avatar) │
├──────────────────────────────────────────┤
│  Chào Minh! Hôm nay học gì nào?           │
│ ┌────────────────────────────────────┐   │
│ │ ▶ Tiếp tục: Cộng có nhớ (Toán 2)   │   │
│ └────────────────────────────────────┘   │
│ [🔢 Toán] [📖 Tiếng Việt] [🔤 English] [🐍 Python]│
│ Nhiệm vụ hôm nay:  ☑ 1 bài  ☐ 3 sao      │
└──────────────────────────────────────────┘
[ Học ] [ Ôn tập ] [ Thành tích ] [ Hồ sơ ]
```

**Màn bài tập**
```
 ✕  ━━━━━━━━━━━━░░░░░░░░  (tiến trình)
        🦊 "Bi hỏi: 7 + 5 = ?"
      ┌──────┐ ┌──────┐
      │  11  │ │  12  │
      └──────┘ └──────┘
      ┌──────┐ ┌──────┐
      │  13  │ │  10  │
      └──────┘ └──────┘
 [          KIỂM TRA          ]
```

## 8. Trang marketing
Hero lớn với linh vật + CTA "Học thử miễn phí", ô chọn lớp, minh họa 4 môn, phần đánh giá của phụ huynh, cam kết an toàn, bảng giá. Mây/ngôi sao parallax nhẹ.

## 9. Tài nguyên minh họa
Vẽ riêng bộ SVG/Lottie (hoặc thuê hoạ sĩ); tạm thời dùng bộ miễn phí có giấy phép thương mại (Open Peeps, unDraw, LottieFiles CC0). Lưu trong `public/art/` và `media_assets`.
