package httpx

import (
	"errors"

	"github.com/gofiber/fiber/v2"
)

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func OK(c *fiber.Ctx, data any) error { return c.JSON(fiber.Map{"data": data}) }

func Fail(c *fiber.Ctx, status int, code, msg string) error {
	return c.Status(status).JSON(fiber.Map{"error": ErrorBody{Code: code, Message: msg}})
}

// ErrorHandler chuẩn hoá mọi lỗi theo định dạng trong docs/04-api.md
func ErrorHandler(c *fiber.Ctx, err error) error {
	var fe *fiber.Error
	if errors.As(err, &fe) {
		code := "INTERNAL"
		switch fe.Code {
		case fiber.StatusNotFound:
			code = "NOT_FOUND"
		case fiber.StatusUnauthorized:
			code = "UNAUTHORIZED"
		case fiber.StatusForbidden:
			code = "FORBIDDEN"
		case fiber.StatusBadRequest:
			code = "VALIDATION_FAILED"
		case fiber.StatusTooManyRequests:
			code = "RATE_LIMITED"
		}
		return Fail(c, fe.Code, code, fe.Message)
	}
	return Fail(c, fiber.StatusInternalServerError, "INTERNAL", "Có lỗi xảy ra, vui lòng thử lại")
}
