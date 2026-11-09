import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Chính sách bảo mật",
  description: "Cách hocde.vn thu thập, sử dụng và bảo vệ dữ liệu của phụ huynh và trẻ em.",
  alternates: { canonical: "/chinh-sach-bao-mat" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Chính sách bảo mật" updated="tháng 11/2026">
      <p>
        hocde.vn là website học trực tuyến dành cho học sinh Tiểu học và THCS. Chúng tôi coi việc bảo vệ dữ liệu
        của trẻ em là ưu tiên hàng đầu và xử lý dữ liệu theo Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
      </p>

      <h2>1. Dữ liệu chúng tôi thu thập</h2>
      <ul>
        <li><strong>Tài khoản phụ huynh (đăng nhập bằng Google):</strong> họ tên, địa chỉ email, ảnh đại diện và mã định danh tài khoản Google. Chúng tôi không nhận mật khẩu Google của bạn.</li>
        <li><strong>Hồ sơ của trẻ:</strong> biệt danh, lớp học, ảnh đại diện nhân vật. Chúng tôi không yêu cầu họ tên thật, địa chỉ, số điện thoại hay ảnh của trẻ.</li>
        <li><strong>Dữ liệu học tập:</strong> bài đã học, câu trả lời, điểm, sao, thời gian học.</li>
        <li><strong>Dữ liệu kỹ thuật:</strong> loại trình duyệt, nhật ký lỗi, cần thiết để vận hành và bảo mật dịch vụ.</li>
      </ul>

      <h2>2. Mục đích sử dụng</h2>
      <p>Cung cấp bài học, ghi nhận tiến độ, hiển thị báo cáo cho phụ huynh, nhắc nghỉ và giới hạn thời gian học, cải thiện chất lượng nội dung và bảo mật hệ thống.</p>

      <h2>3. Cam kết với dữ liệu của trẻ em</h2>
      <ul>
        <li>Chỉ phụ huynh/người giám hộ được tạo tài khoản và hồ sơ cho trẻ.</li>
        <li>Không quảng cáo, không bán hoặc chia sẻ dữ liệu của trẻ cho bên thứ ba vì mục đích thương mại.</li>
        <li>Không có chat hay bình luận công khai giữa trẻ em.</li>
      </ul>

      <h2>4. Lưu trữ và bảo mật</h2>
      <p>Dữ liệu được truyền qua kết nối mã hoá (HTTPS) và lưu trong cơ sở dữ liệu có kiểm soát truy cập. Phiên đăng nhập dùng cookie HttpOnly. Chúng tôi chỉ lưu dữ liệu trong thời gian cần thiết để cung cấp dịch vụ.</p>

      <h2>5. Quyền của phụ huynh</h2>
      <p>Bạn có quyền truy cập, chỉnh sửa, yêu cầu xuất và xoá dữ liệu của mình và của con, cũng như rút lại sự đồng ý bất cứ lúc nào. Khi bạn yêu cầu xoá, dữ liệu sẽ được xoá khỏi hệ thống.</p>

      <h2>6. Cookie</h2>
      <p>Chúng tôi dùng cookie cần thiết để duy trì phiên đăng nhập và bảo mật quá trình đăng nhập. Chúng tôi không dùng cookie quảng cáo.</p>

      <h2>7. Thay đổi chính sách</h2>
      <p>Khi chính sách thay đổi đáng kể, chúng tôi sẽ thông báo trên website và xin lại sự đồng ý nếu pháp luật yêu cầu.</p>

      <h2>8. Liên hệ</h2>
      <p>Thông tin liên hệ về dữ liệu cá nhân sẽ được công bố tại đây khi hocde.vn ra mắt chính thức.</p>
    </LegalPage>
  );
}
