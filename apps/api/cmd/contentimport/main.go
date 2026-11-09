// Lệnh: contentimport [-validate] <thư-mục-khoá-học>...
// VD:   go run ./cmd/contentimport ../../content/tieng-viet/lop-1
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"

	"github.com/hocde/api/internal/config"
	"github.com/hocde/api/internal/content"
	"github.com/hocde/api/internal/platform"
)

func main() {
	validateOnly := flag.Bool("validate", false, "chỉ kiểm tra, không ghi CSDL")
	flag.Parse()
	if flag.NArg() == 0 {
		fmt.Fprintln(os.Stderr, "dùng: contentimport [-validate] <thư-mục-khoá-học>...")
		os.Exit(2)
	}
	_ = godotenv.Load("../../.env", ".env")

	failed := false
	var courses []*content.Course
	for _, dir := range flag.Args() {
		c, err := content.Load(dir)
		if err != nil {
			fmt.Fprintf(os.Stderr, "LỖI đọc %s: %v\n", dir, err)
			failed = true
			continue
		}
		if errs := c.Validate(); len(errs) > 0 {
			failed = true
			fmt.Fprintf(os.Stderr, "%s: %d lỗi\n", dir, len(errs))
			for _, e := range errs {
				fmt.Fprintf(os.Stderr, "  - %v\n", e)
			}
			continue
		}
		fmt.Printf("OK  %s (%d chương)\n", dir, len(c.Units))
		courses = append(courses, c)
	}
	if failed {
		os.Exit(1)
	}
	if *validateOnly {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()
	db, err := platform.NewPG(ctx, config.Load().DatabaseURL)
	if err != nil {
		fmt.Fprintln(os.Stderr, "kết nối CSDL:", err)
		os.Exit(1)
	}
	defer db.Close()
	for _, c := range courses {
		r, err := content.Import(ctx, db, c)
		if err != nil {
			fmt.Fprintln(os.Stderr, "nhập thất bại:", err)
			os.Exit(1)
		}
		fmt.Printf("Đã nhập %s: %d chương, %d bài, %d bài tập\n", c.Slug, r.Units, r.Lessons, r.Exercises)
	}
}
