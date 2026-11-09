package content

import (
	"os"
	"path/filepath"
	"testing"
)

// Kiểm tra toàn bộ nội dung thật trong content/<môn>/<lớp>.
func TestRealContentIsValid(t *testing.T) {
	root := filepath.Join("..", "..", "..", "..", "content")
	courses, _ := filepath.Glob(filepath.Join(root, "*", "*", "_course.yaml"))
	if len(courses) == 0 {
		t.Skip("không có nội dung trong content/")
	}
	for _, f := range courses {
		dir := filepath.Dir(f)
		t.Run(filepath.Base(filepath.Dir(dir))+"/"+filepath.Base(dir), func(t *testing.T) {
			c, err := Load(dir)
			if err != nil {
				t.Fatal(err)
			}
			for _, e := range c.Validate() {
				t.Error(e)
			}
		})
	}
}

func writeTree(t *testing.T, files map[string]string) string {
	t.Helper()
	dir := t.TempDir()
	for name, body := range files {
		p := filepath.Join(dir, name)
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	return dir
}

const goodCourse = `subject: tieng-viet
grade: 1
slug: tv-1
title: TV1
units:
  - slug: u1
    title: U1
    lessons: [l1]
`

func lesson(extra string) string {
	return `schema: 1
slug: l1
title: L1
blocks:
  - { id: b1, type: text, markdown: "xin chào" }
` + extra
}

func validate(t *testing.T, lessonYAML string) []error {
	t.Helper()
	dir := writeTree(t, map[string]string{"_course.yaml": goodCourse, "u1/l1.yaml": lessonYAML})
	c, err := Load(dir)
	if err != nil {
		t.Fatal(err)
	}
	return c.Validate()
}

func TestValidMinimalLesson(t *testing.T) {
	errs := validate(t, lesson(`  - id: e1
    type: exercise
    kind: mcq
    points: 10
    prompt: "?"
    options: [{id: a, text: x}, {id: b, text: y}]
    answer: { correct: [a] }
  - { id: s1, type: summary, markdown: "xong" }
`))
	if len(errs) != 0 {
		t.Fatalf("mong đợi hợp lệ, nhận %v", errs)
	}
}

func TestInvalidLessons(t *testing.T) {
	cases := map[string]string{
		"không có bài tập": lesson(""),
		"đáp án không có trong options": lesson(`  - id: e1
    type: exercise
    kind: mcq
    points: 10
    prompt: "?"
    options: [{id: a, text: x}, {id: b, text: y}]
    answer: { correct: [z] }
`),
		"trùng id": lesson(`  - { id: b1, type: text, markdown: "lại" }
  - id: e1
    type: exercise
    kind: fill_blank
    points: 10
    prompt: "?"
    answer: { accept: [a] }
`),
		"type lạ": lesson(`  - { id: b2, type: banana }
`),
	}
	for name, y := range cases {
		t.Run(name, func(t *testing.T) {
			if errs := validate(t, y); len(errs) == 0 {
				t.Fatal("mong đợi có lỗi, nhưng hợp lệ")
			}
		})
	}
}

func TestUnknownFieldRejected(t *testing.T) {
	dir := writeTree(t, map[string]string{
		"_course.yaml": goodCourse,
		"u1/l1.yaml":   "schema: 1\nslug: l1\ntitle: L\ntypo_field: 1\nblocks: []\n",
	})
	if _, err := Load(dir); err == nil {
		t.Fatal("mong đợi lỗi vì trường lạ")
	}
}
