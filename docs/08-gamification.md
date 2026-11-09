# 08. Gamification (động lực học tập)

Nguyên tắc: khuyến khích **kiên trì & tiến bộ**, không tạo áp lực cạnh tranh hay nghiện. Không có "mất mạng/hết tim" khiến trẻ bị chặn học.

## 1. Sao ⭐ cho mỗi bài
Điểm bài = % bài tập đúng ở lần làm tốt nhất (lần đầu đúng tính đủ, thử lại tính 50%).
| Điểm | Sao |
|---|---|
| ≥ 90% | ⭐⭐⭐ |
| 70–89% | ⭐⭐ |
| 40–69% | ⭐ |
| < 40% | 0 – khuyến khích học lại, không phạt |

Bài kế mở khi ≥ 1⭐. Làm lại để lấy thêm sao (chỉ cộng phần chênh lệch).

## 2. XP & cấp độ
- XP = tổng `points` bài tập đúng + thưởng hoàn thành (`xp_reward`) + thưởng "hoàn hảo" (+10).
- Level: `level = floor(sqrt(total_xp / 50)) + 1`. Mỗi level có danh hiệu vui: *Cáo con → Thám hiểm → Phù thuỷ số → Siêu nhân Python…*
- Thêm vật phẩm tuỳ biến avatar (mũ, kính, màu) mở bằng sao.

## 3. Streak 🔥
- Một ngày tính khi hoàn thành ≥ 1 bài (hoặc ≥ 5 phút).
- Có **"đóng băng streak"** (1 lần/tuần miễn phí) để không nản khi nghỉ.
- Mốc thưởng: 3, 7, 14, 30, 100 ngày.

## 4. Huy hiệu
| code | Tên | Điều kiện |
|---|---|---|
| `first_lesson` | Bước chân đầu tiên | Hoàn thành bài đầu |
| `streak_7` | Tuần lửa | Streak 7 ngày |
| `perfect_5` | Bé thông thái | 5 bài đạt 3⭐ |
| `math_master_g2` | Nhà toán học nhí | Hoàn thành 100% Toán lớp 2 |
| `first_code` | Phù thuỷ code | Bài code đầu tiên đạt test |
| `bookworm` | Mọt sách | 20 bài Tiếng Việt |
| `polyglot` | Bạn nhỏ quốc tế | 20 bài Tiếng Anh |
| `night_owl` / `early_bird` | (Không khuyến khích học khuya – không có) |
Quy tắc lưu ở `badges.rule` (JSONB); service `reward` đánh giá sau mỗi sự kiện (lesson_complete, streak_update).

## 5. Nhiệm vụ hằng ngày
3 nhiệm vụ ngẫu nhiên/ngày: "Hoàn thành 1 bài", "Đạt 3 sao ở 1 bài", "Ôn 5 câu sai". Hoàn thành cả 3 → rương quà (sao + vật phẩm).

## 6. Bảng xếp hạng (GĐ2, tuỳ chọn, ẩn danh)
Chỉ trong **lớp/nhóm bạn** do phụ huynh/giáo viên bật; hiển thị biệt danh + avatar; tuần reset; xếp theo XP tuần. Có thể tắt hoàn toàn.

## 7. Báo cáo cho phụ huynh
Không hiển thị thứ hạng so sánh; tập trung: thời gian học, số bài, tỉ lệ đúng theo kỹ năng, điểm cần luyện thêm, gợi ý hoạt động ngoài màn hình.

## 8. Chống lạm dụng
Giới hạn thời gian/ngày (phụ huynh đặt), nhắc nghỉ 20 phút, không popup quảng cáo, không mua trong ứng dụng ở khu trẻ em.
