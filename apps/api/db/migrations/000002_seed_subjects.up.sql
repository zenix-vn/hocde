INSERT INTO subjects (slug, name, description, color, icon_key, sort_order) VALUES
 ('toan','Toán','Học toán bằng hình ảnh và trò chơi','#4CC9F0','math',1),
 ('tieng-viet','Tiếng Việt','Tập đọc, tập viết, vui học chữ','#FF6B9D','book',2),
 ('tieng-anh','Tiếng Anh','Từ vựng, nghe nói vui nhộn','#5BD66B','abc',3),
 ('python','Lập trình Python','Viết những dòng code đầu tiên','#8E6CF0','code',4)
ON CONFLICT (slug) DO NOTHING;
