import type { Metadata } from "next";
import { LegalPage } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Điều khoản sử dụng",
  description: "Điều khoản sử dụng dịch vụ học trực tuyến hocde.vn.",
  alternates: { canonical: "/dieu-khoan" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Điều khoản sử dụng" updated="tháng 11/2026">
      <p>Khi tạo tài khoản và sử dụng hocde.vn, bạn đồng ý với các điều khoản dưới đây.</p>

      <h2>1. Người dùng</h2>
      <p>Tài khoản chỉ dành cho phụ huynh/người giám hộ từ đủ 18 tuổi. Bạn chịu trách nhiệm về hoạt động của hồ sơ trẻ em trong tài khoản của mình và đảm bảo con sử dụng dịch vụ dưới sự giám sát phù hợp.</p>

      <h2>2. Tài khoản</h2>
      <p>Bạn đăng nhập bằng tài khoản Google và chịu trách nhiệm bảo mật tài khoản đó cũng như mã PIN khu vực phụ huynh. Hãy báo cho chúng tôi nếu phát hiện truy cập trái phép.</p>

      <h2>3. Sử dụng hợp lệ</h2>
      <ul>
        <li>Không can thiệp, khai thác lỗ hổng hoặc làm gián đoạn hệ thống.</li>
        <li>Không sao chép, phân phối lại nội dung bài học khi chưa được phép.</li>
        <li>Không dùng dịch vụ cho mục đích vi phạm pháp luật hoặc gây hại cho trẻ em.</li>
      </ul>

      <h2>4. Nội dung</h2>
      <p>Bài giảng, hình ảnh, âm thanh và phần mềm trên hocde.vn thuộc quyền sở hữu của hocde.vn hoặc bên cấp phép. Nội dung mang tính hỗ trợ học tập và không thay thế chương trình học chính thức.</p>

      <h2>5. Dữ liệu cá nhân</h2>
      <p>Việc xử lý dữ liệu được mô tả trong Chính sách bảo mật, là một phần của các điều khoản này.</p>

      <h2>6. Chấm dứt</h2>
      <p>Bạn có thể ngừng sử dụng và yêu cầu xoá tài khoản bất cứ lúc nào. Chúng tôi có thể tạm khoá tài khoản vi phạm điều khoản.</p>

      <h2>7. Miễn trừ và thay đổi</h2>
      <p>Dịch vụ được cung cấp trên cơ sở “hiện có”, chúng tôi nỗ lực duy trì hoạt động ổn định nhưng không đảm bảo không gián đoạn. Điều khoản có thể được cập nhật và sẽ được thông báo trên website.</p>
    </LegalPage>
  );
}
