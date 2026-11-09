package admin

import (
	"encoding/json"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestEscapeLike(t *testing.T) {
	if got, want := escapeLike(`50%_a\b`), `50\%\_a\\b`; got != want {
		t.Fatalf("escapeLike = %q, want %q", got, want)
	}
}

func TestPaging(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error { return c.JSON(paging(c)) })
	cases := map[string]page{
		"/":                       {N: 1, Size: 20, Offset: 0},
		"/?page=3&page_size=10":   {N: 3, Size: 10, Offset: 20},
		"/?page=-5&page_size=999": {N: 1, Size: 20, Offset: 0},
		"/?page=abc":              {N: 1, Size: 20, Offset: 0},
	}
	for url, want := range cases {
		res, err := app.Test(httptest.NewRequest("GET", url, nil))
		if err != nil {
			t.Fatal(err)
		}
		var got page
		if err := json.NewDecoder(res.Body).Decode(&got); err != nil {
			t.Fatal(err)
		}
		if got != want {
			t.Errorf("%s: got %+v want %+v", url, got, want)
		}
	}
}

func TestUUIDParam(t *testing.T) {
	app := fiber.New()
	app.Get("/:id", func(c *fiber.Ctx) error {
		if _, err := uuidParam(c, "id"); err != nil {
			return err
		}
		return c.SendStatus(200)
	})
	ok := httptest.NewRequest("GET", "/3f2b8c1e-9d4a-4f6b-8a1c-0123456789ab", nil)
	if res, _ := app.Test(ok); res.StatusCode != 200 {
		t.Fatalf("uuid hợp lệ bị từ chối: %d", res.StatusCode)
	}
	bad := httptest.NewRequest("GET", "/not-a-uuid", nil)
	if res, _ := app.Test(bad); res.StatusCode != 404 {
		t.Fatalf("uuid sai phải 404, được %d", res.StatusCode)
	}
}

func TestSubjectAndCourseValidation(t *testing.T) {
	s := func(v string) *string { return &v }
	if err := (&subjectReq{Slug: s("Toan"), Name: s("Toán")}).validate(true); err == nil {
		t.Error("slug viết hoa phải bị từ chối")
	}
	if err := (&subjectReq{Slug: s("toan"), Name: s("Toán"), Color: s("red")}).validate(true); err == nil {
		t.Error("màu sai phải bị từ chối")
	}
	if err := (&subjectReq{Slug: s("toan"), Name: s("Toán"), Color: s("#0b63d6")}).validate(true); err != nil {
		t.Errorf("môn hợp lệ bị từ chối: %v", err)
	}
	g := 12
	if err := (&courseReq{Grade: &g}).validate(false); err == nil {
		t.Error("lớp 12 phải bị từ chối")
	}
	if err := (&lessonReq{Slug: s("bai-1")}).validate(true); err == nil {
		t.Error("thiếu tiêu đề phải bị từ chối")
	}
	est := 99
	if err := (&lessonReq{Est: &est}).validate(false); err == nil {
		t.Error("thời lượng 99 phút phải bị từ chối")
	}
}

func TestReorderValidation(t *testing.T) {
	if err := (&reorderReq{IDs: []string{"x"}}).validate(); err == nil {
		t.Error("id không phải uuid phải bị từ chối")
	}
	if err := (&reorderReq{}).validate(); err == nil {
		t.Error("danh sách rỗng phải bị từ chối")
	}
	ok := &reorderReq{IDs: []string{"3f2b8c1e-9d4a-4f6b-8a1c-0123456789ab"}}
	if err := ok.validate(); err != nil {
		t.Errorf("danh sách hợp lệ bị từ chối: %v", err)
	}
}

func TestStarterContentIsValidJSONBlocks(t *testing.T) {
	blocks, err := parseBlocks([]byte(starterContent))
	if err != nil || len(blocks) != 2 {
		t.Fatalf("starterContent lỗi: %v (%d khối)", err, len(blocks))
	}
}
