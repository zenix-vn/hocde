"use client";

import Link from "next/link";
import { useState } from "react";
import { GoogleButton } from "./GoogleButton";

export function SignupPanel() {
  const [agree, setAgree] = useState(false);
  return (
    <div className="space-y-5">
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-cloud p-4 text-[15px]">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-1 size-5 shrink-0 accent-brand"
        />
        <span>
          Tôi là phụ huynh/người giám hộ, đã đọc và đồng ý với{" "}
          <Link href="/dieu-khoan" target="_blank" className="font-bold text-brand underline">Điều khoản sử dụng</Link> và{" "}
          <Link href="/chinh-sach-bao-mat" target="_blank" className="font-bold text-brand underline">Chính sách bảo mật</Link>,
          đồng ý cho hocde.vn xử lý dữ liệu học tập của con tôi.
        </span>
      </label>
      <GoogleButton disabled={!agree} href="/api/v1/auth/google/start?mode=signup&consent=1">
        Đăng ký với Google
      </GoogleButton>
      {!agree && <p className="text-center text-sm text-ink/55">Hãy tick ô đồng ý ở trên để tiếp tục.</p>}
    </div>
  );
}
