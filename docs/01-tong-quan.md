# 01. Tổng quan sản phẩm

## 1. Tầm nhìn
Giúp trẻ em Việt Nam (lớp 1–9) học bằng cách **chơi, xem, làm** thay vì chỉ đọc. Mỗi bài học ngắn (5–10 phút), có hình ảnh/hoạt hình, câu hỏi tương tác và phần thưởng ngay lập tức.

## 2. Người dùng

| Vai trò | Mô tả | Nhu cầu chính |
|---|---|---|
| **Học sinh** (6–15 tuổi) | Dùng hồ sơ con, không cần email | Học, làm bài, nhận sao/huy hiệu |
| **Phụ huynh** | Chủ tài khoản, tạo tối đa 5 hồ sơ con | Xem tiến độ, đặt giới hạn thời gian, nhận báo cáo tuần |
| **Giáo viên** (giai đoạn 2) | Tạo lớp, giao bài | Theo dõi cả lớp |
| **Biên tập viên** | Soạn nội dung | CMS soạn bài, duyệt, xuất bản |
| **Admin** | Quản trị | Người dùng, nội dung, thống kê |

## 3. Cấp học & môn học

| Cấp | Lớp | Môn |
|---|---|---|
| Tiểu học – Cấp 1 | 1–5 | Toán, Tiếng Việt, Tiếng Anh, Tin học (Scratch-like/Python cơ bản từ lớp 4) |
| THCS | 6–9 | Toán, Ngữ văn, Tiếng Anh, Lập trình Python, (mở rộng: KHTN, Lịch sử–Địa lý) |

Cấu trúc nội dung: **Môn → Lớp → Chương (Unit) → Bài học (Lesson) → Hoạt động (Activity/Block)**.

Ví dụ: Toán 2 → Chương "Phép cộng trong phạm vi 100" → Bài "Cộng có nhớ" → [video hoạt hình, mô phỏng que tính kéo-thả, 5 câu trắc nghiệm, 1 thử thách].

### Đặc thù từng môn (ưu tiên trực quan)
- **Toán**: que tính, khối lập phương, trục số, thước kẻ, hình học kéo-thả, bảng cửu chương dạng trò chơi, GeoGebra-like canvas.
- **Tiếng Việt**: ghép vần, tập đọc có tô sáng từng chữ theo giọng đọc (TTS/audio), tập viết nét chữ (canvas), điền từ, đặt câu, trò chơi từ.
- **Tiếng Anh**: flashcard có hình + phát âm, nghe–chọn, ghép từ–hình, nói (Web Speech API), hội thoại ngắn.
- **Lập trình Python**: giải thích từng dòng lệnh bằng hình minh họa, trình soạn code trong trình duyệt, chạy ngay (Pyodide), mô phỏng "chú rùa" (turtle), bài tập tự chấm.

## 4. Tính năng

### MVP (Giai đoạn 1)
- Đăng ký/đăng nhập phụ huynh; tạo hồ sơ con (avatar, tên, lớp); đổi hồ sơ bằng PIN.
- Danh mục môn → chương → bài; trang bài học dạng các "màn" (slide-step).
- 8 dạng bài tập (xem mục 07).
- Chấm điểm tự động, lưu tiến độ, sao ⭐ (1–3 sao/bài), XP, streak.
- Bảng điều khiển phụ huynh (tiến độ, thời gian học).
- CMS cơ bản cho biên tập viên.
- 2 môn mẫu hoàn chỉnh: **Toán lớp 1–2** và **Python cơ bản**; các môn còn lại có khung.

### Giai đoạn 2
- Huy hiệu, bảng xếp hạng lớp/bạn bè (ẩn danh), nhiệm vụ hằng ngày.
- Lớp học giáo viên, giao bài, báo cáo.
- Ôn tập thông minh (spaced repetition) theo lỗi sai.
- Chế độ offline (PWA), thông báo nhắc học.

### Giai đoạn 3
- Gợi ý lộ trình cá nhân hóa (adaptive).
- Gói Premium (thanh toán VNPay/Momo), app mobile (React Native / PWA).
- AI trợ giảng giải thích lỗi sai (có bộ lọc an toàn).

## 5. Yêu cầu phi chức năng
- Tải trang đầu < 2s trên 4G; LCP < 2.5s; ưu tiên SSR/SSG cho trang công khai (SEO).
- Hỗ trợ tablet/điện thoại (đa số trẻ dùng tablet): thiết kế **mobile-first, touch-friendly** (nút ≥ 48px).
- Khả năng truy cập: tương phản tốt, đọc được bằng screen reader, tuỳ chọn cỡ chữ, hỗ trợ bàn phím.
- Tuân thủ Nghị định 13/2023/NĐ-CP (bảo vệ dữ liệu cá nhân), có sự đồng ý của phụ huynh với dữ liệu trẻ em.
- Ngôn ngữ giao diện: Tiếng Việt (chính), có sẵn i18n để thêm tiếng Anh.

## 6. Chỉ số thành công
- Tỷ lệ hoàn thành bài ≥ 70%; D7 retention ≥ 30%; số ngày streak trung bình; thời gian học/phiên 10–20 phút.
