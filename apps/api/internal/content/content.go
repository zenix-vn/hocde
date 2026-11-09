// Package content đọc, kiểm tra và nhập nội dung bài học từ thư mục content/ (YAML).
package content

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"gopkg.in/yaml.v3"
)

type Course struct {
	Subject string `yaml:"subject"`
	Grade   int    `yaml:"grade"`
	Slug    string `yaml:"slug"`
	Title   string `yaml:"title"`
	Summary string `yaml:"summary"`
	Status  string `yaml:"status"`
	Units   []Unit `yaml:"units"`
}

type Unit struct {
	Slug        string   `yaml:"slug"`
	Title       string   `yaml:"title"`
	Summary     string   `yaml:"summary"`
	LessonNames []string `yaml:"lessons"`

	Lessons []*Lesson `yaml:"-"`
}

type Lesson struct {
	Schema     int              `yaml:"schema"`
	Slug      string           `yaml:"slug"`
	Title      string           `yaml:"title"`
	Summary    string           `yaml:"summary"`
	EstMinutes int              `yaml:"est_minutes"`
	XPReward   int              `yaml:"xp_reward"`
	Status     string           `yaml:"status"`
	Blocks     []map[string]any `yaml:"blocks"`

	File string `yaml:"-"`
}

// Load đọc _course.yaml trong thư mục khoá học (VD content/tieng-viet/lop-1) và mọi bài được liệt kê.
func Load(dir string) (*Course, error) {
	raw, err := os.ReadFile(filepath.Join(dir, "_course.yaml"))
	if err != nil {
		return nil, err
	}
	var c Course
	if err := decodeStrict(raw, &c); err != nil {
		return nil, fmt.Errorf("_course.yaml: %w", err)
	}
	for i := range c.Units {
		u := &c.Units[i]
		for _, name := range u.LessonNames {
			path := filepath.Join(dir, u.Slug, name+".yaml")
			b, err := os.ReadFile(path)
			if err != nil {
				return nil, fmt.Errorf("unit %q: %w", u.Slug, err)
			}
			var l Lesson
			if err := decodeStrict(b, &l); err != nil {
				return nil, fmt.Errorf("%s: %w", path, err)
			}
			l.File = path
			u.Lessons = append(u.Lessons, &l)
		}
	}
	return &c, nil
}

func decodeStrict(b []byte, out any) error {
	dec := yaml.NewDecoder(strings.NewReader(string(b)))
	dec.KnownFields(true)
	return dec.Decode(out)
}
