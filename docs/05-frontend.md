# 05. Thiết kế Frontend (Next.js 15, App Router)

## 1. Bản đồ trang (routes)

```
src/app/
├── (marketing)/                    # công khai, SSG/ISR, SEO
│   ├── page.tsx                    # Trang chủ giới thiệu
│   ├── mon-hoc/page.tsx            # Danh sách môn
│   ├── mon-hoc/[subject]/[grade]/page.tsx   # Khóa học (VD: toan/2)
│   ├── bai-hoc/[slug]/page.tsx     # Xem thử bài (học thử không cần đăng nhập)
│   └── gioi-thieu, lien-he, chinh-sach-bao-mat
├── (auth)/dang-nhap, dang-ky, quen-mat-khau
├── (kid)/                          # khu học sinh – cần chọn hồ sơ
│   ├── chon-ho-so/page.tsx         # Màn chọn nhân vật
│   ├── hoc/page.tsx                # Trang chủ học sinh: Tiếp tục học, nhiệm vụ, streak
│   ├── hoc/[subject]/page.tsx      # Bản đồ học tập (đường đi dạng "đảo/đường mòn")
│   ├── hoc/bai/[slug]/page.tsx     # Player bài học (full-screen)
│   ├── thanh-tich/page.tsx         # Huy hiệu, sao, level
│   └── on-tap/page.tsx
├── (parent)/phu-huynh/             # khu phụ huynh – yêu cầu PIN
│   ├── page.tsx (dashboard), ho-so/, bao-cao/[profileId], cai-dat/
├── (cms)/cms/                      # editor
│   ├── page.tsx, mon-hoc/, bai-hoc/[id]/soan-bai (trình soạn block)
└── api/revalidate/route.ts         # webhook từ CMS
```

## 2. Render strategy
| Trang | Chiến lược |
|---|---|
| Marketing, danh sách khóa | SSG + ISR (`revalidate: 300`, tag `catalog`) |
| Bài học xem thử | ISR |
| Khu học sinh/phụ huynh/CMS | Client-rendered sau khi xác thực (middleware kiểm tra cookie), dữ liệu qua TanStack Query |
| Player bài học | Server Component lấy nội dung + Client Component `LessonPlayer` |

`middleware.ts`: chuyển hướng `/hoc/*`, `/phu-huynh/*`, `/cms/*` nếu chưa đăng nhập / chưa chọn hồ sơ.

## 3. Cấu trúc component

```
components/
├── ui/            # Button (3D "kẹo"), Card, Badge, ProgressBar, Modal, Toast, Tabs, Avatar, StarRating, Confetti
├── layout/        # KidShell (thanh dưới trên mobile), ParentShell, TopBar (streak, sao, XP), Footer
├── mascot/        # Mascot.tsx (Lottie/SVG: vui, buồn, nhảy, suy nghĩ), SpeechBubble
├── lesson/
│   ├── LessonPlayer.tsx       # điều phối các block, thanh tiến trình, nút Tiếp tục
│   ├── blocks/                # TextBlock, ImageBlock, VideoBlock, AudioBlock, MascotSay, CalloutBlock...
│   ├── interactive/           # Counters, NumberLine, Abacus, ClockFace, FractionPie, Turtle, FlashCard...
│   ├── exercise/              # Mcq, FillBlank, Matching, Ordering, DragDrop, NumberInput, Typing, SpeakIt, CodeExercise
│   └── ResultScreen.tsx       # sao + confetti + XP + huy hiệu mới
├── code/          # CodeEditor (CodeMirror 6), PythonConsole, TurtleCanvas, usePyodide
└── cms/           # BlockEditor, BlockPalette, MediaPicker, PreviewFrame
```

**Registry block** (mở rộng dễ dàng):
```tsx
const registry: Record<string, React.FC<BlockProps>> = {
  text: TextBlock, image: ImageBlock, mascot_say: MascotSay,
  interactive: InteractiveBlock, exercise: ExerciseBlock, code: CodeBlock, ...
};
export const BlockRenderer = ({ block }: { block: Block }) => {
  const C = registry[block.type] ?? UnknownBlock;
  return <C block={block} />;
};
```

## 4. Quản lý state & dữ liệu
- **Server state**: TanStack Query (`useCourse`, `useLesson`, `useProgress`), client sinh từ OpenAPI (`openapi-typescript` + `openapi-fetch`).
- **Client state** (Zustand): `useSessionStore` (hồ sơ hiện tại), `useLessonStore` (block index, câu trả lời, số lần sai, sao tạm), `useSettingsStore` (âm thanh, cỡ chữ, giảm chuyển động).
- **Form**: React Hook Form + Zod.
- **Auth**: access token giữ trong bộ nhớ; refresh tự động bằng interceptor.

## 5. LessonPlayer – hành vi
1. Chia bài thành các "màn" (step); thanh tiến trình trên cùng hiển thị theo block.
2. Nút **Tiếp tục** to ở dưới; với bài tập: nút **Kiểm tra** → hiện panel đúng (xanh, linh vật vui) / sai (cam nhẹ nhàng, gợi ý, cho thử lại tối đa 2 lần).
3. Âm thanh: đúng "ting", sai "boop" nhẹ; có nút tắt tiếng.
4. Tự lưu vị trí (debounce) → học tiếp khi quay lại.
5. Phím tắt: `Enter` = Kiểm tra/Tiếp tục, `1-4` chọn đáp án, `←/→`.
6. Cuối bài: `ResultScreen` (confetti, sao 1–3, XP bay lên, streak, huy hiệu).
7. Hiển thị thanh nhắc nghỉ mắt sau 20 phút.

## 6. Hiệu năng
- `next/image`, ảnh WebP/AVIF; Lottie tải lazy; bài tương tác `dynamic import` (`ssr:false`).
- **Pyodide chỉ tải khi mở bài Python** (≈10MB, cache bằng Service Worker); chạy trong Web Worker để UI không đứng.
- Font tự host (`next/font`) với subset `vietnamese`.
- Prefetch bài kế tiếp khi học gần xong.

## 7. i18n & a11y
- `next-intl` (mặc định `vi`).
- Mọi hình có `alt`; kéo-thả có phương án thay thế bằng bàn phím/chạm-chọn; tôn trọng `prefers-reduced-motion`; tỷ lệ tương phản ≥ 4.5:1 với chữ; chế độ chữ lớn; font dễ đọc cho trẻ (có tuỳ chọn Lexend).

## 8. Kiểm thử FE
Vitest + Testing Library (component), Playwright (E2E: đăng ký → tạo hồ sơ → học 1 bài → xem báo cáo), Storybook cho thư viện UI.
