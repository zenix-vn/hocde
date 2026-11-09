package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

// OriginCheck chống CSRF cho các request ghi dùng cookie: nếu trình duyệt gửi header Origin
// thì phải thuộc danh sách cho phép (cookie đã có SameSite=Lax làm lớp bảo vệ thứ hai).
func OriginCheck(allowed ...string) fiber.Handler {
	set := map[string]bool{}
	for _, a := range allowed {
		for _, o := range strings.Split(a, ",") {
			if o = strings.TrimSpace(o); o != "" {
				set[o] = true
			}
		}
	}
	return func(c *fiber.Ctx) error {
		switch c.Method() {
		case fiber.MethodGet, fiber.MethodHead, fiber.MethodOptions:
			return c.Next()
		}
		if o := c.Get("Origin"); o != "" && !set[o] {
			return fiber.NewError(fiber.StatusForbidden, "Nguồn yêu cầu không hợp lệ")
		}
		return c.Next()
	}
}
