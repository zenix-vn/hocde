package content

import (
	"fmt"
	"regexp"
	"strings"
)

var slugRe = regexp.MustCompile(`^[a-z0-9]+(-[a-z0-9]+)*$`)

var statuses = set("draft", "review", "published", "archived")

var blockTypes = set("mascot_say", "text", "image", "gallery", "video", "audio", "callout",
	"steps", "interactive", "code_demo", "exercise", "summary")

var exerciseKinds = set("mcq", "true_false", "fill_blank", "number_input", "match", "order",
	"drag_drop", "hotspot", "typing", "speak", "listen_choose", "draw_trace", "code")

var interactiveKinds = set(
	"counters", "number_line", "abacus", "base10_blocks", "clock", "fraction_pie",
	"multiplication_grid", "shape_builder", "angle_protractor", "coordinate_plane", "function_plotter",
	"syllable_builder", "read_along", "word_sort", "sentence_builder", "handwriting",
	"flashcards", "picture_dictionary", "dialogue", "spelling_bee",
	"turtle", "variable_box", "loop_visualizer", "list_viz", "flowchart")

func set(v ...string) map[string]bool {
	m := make(map[string]bool, len(v))
	for _, s := range v {
		m[s] = true
	}
	return m
}

// Validate trả về mọi lỗi tìm thấy (rỗng nếu hợp lệ).
func (c *Course) Validate() []error {
	var errs []error
	add := func(format string, a ...any) { errs = append(errs, fmt.Errorf(format, a...)) }

	if !slugRe.MatchString(c.Slug) {
		add("course: slug %q không hợp lệ", c.Slug)
	}
	if c.Subject == "" || c.Title == "" {
		add("course: thiếu subject hoặc title")
	}
	if c.Grade < 1 || c.Grade > 9 {
		add("course: grade %d ngoài 1..9", c.Grade)
	}
	if c.Status != "" && !statuses[c.Status] {
		add("course: status %q không hợp lệ", c.Status)
	}

	unitSlugs := map[string]bool{}
	lessonSlugs := map[string]string{}
	for _, u := range c.Units {
		if !slugRe.MatchString(u.Slug) {
			add("unit %q: slug không hợp lệ", u.Slug)
		}
		if unitSlugs[u.Slug] {
			add("unit %q: trùng slug", u.Slug)
		}
		unitSlugs[u.Slug] = true
		if u.Title == "" {
			add("unit %q: thiếu title", u.Slug)
		}
		for _, l := range u.Lessons {
			for _, e := range l.Validate() {
				add("%s: %v", l.File, e)
			}
			if prev, dup := lessonSlugs[l.Slug]; dup {
				add("%s: slug %q trùng với %s", l.File, l.Slug, prev)
			}
			lessonSlugs[l.Slug] = l.File
		}
	}
	return errs
}

// Validate kiểm tra một bài học (dùng cho cả nhập từ file và trình soạn trong admin).
func (l *Lesson) Validate() []error {
	var errs []error
	add := func(format string, a ...any) { errs = append(errs, fmt.Errorf(format, a...)) }

	if !slugRe.MatchString(l.Slug) {
		add("slug %q không hợp lệ", l.Slug)
	}
	if l.Title == "" {
		add("thiếu title")
	}
	if l.Status != "" && !statuses[l.Status] {
		add("status %q không hợp lệ", l.Status)
	}
	if l.EstMinutes < 0 || l.EstMinutes > 30 {
		add("est_minutes %d ngoài 0..30", l.EstMinutes)
	}
	if len(l.Blocks) == 0 {
		add("bài không có block nào")
	}

	ids := map[string]bool{}
	hasExercise := false
	for i, b := range l.Blocks {
		id := str(b["id"])
		typ := str(b["type"])
		where := fmt.Sprintf("block #%d (%s)", i+1, id)
		if id == "" {
			add("block #%d: thiếu id", i+1)
			continue
		}
		if ids[id] {
			add("%s: trùng id", where)
		}
		ids[id] = true
		if !blockTypes[typ] {
			add("%s: type %q không hợp lệ", where, typ)
			continue
		}
		if l := str(b["lang"]); l != "" && l != "vi" && l != "en" {
			add("%s: lang %q không hợp lệ (chỉ vi hoặc en)", where, l)
		}
		for _, e := range validateSay(b["say"]) {
			add("%s: %v", where, e)
		}
		switch typ {
		case "mascot_say":
			if str(b["text"]) == "" {
				add("%s: thiếu text", where)
			}
		case "text", "callout", "summary":
			if str(b["markdown"]) == "" {
				add("%s: thiếu markdown", where)
			}
		case "interactive":
			if k := str(b["kind"]); !interactiveKinds[k] {
				add("%s: interactive.kind %q không hợp lệ", where, k)
			}
			if _, ok := b["config"].(map[string]any); !ok {
				add("%s: thiếu config", where)
			}
		case "exercise":
			hasExercise = true
			for _, e := range validateExercise(b) {
				add("%s: %v", where, e)
			}
		}
	}
	if !hasExercise {
		add("bài không có bài tập nào")
	}
	if n := len(l.Blocks); n > 0 && str(l.Blocks[n-1]["type"]) != "summary" {
		add("block cuối cùng phải là summary")
	}
	return errs
}

func validateExercise(b map[string]any) []error {
	var errs []error
	add := func(format string, a ...any) { errs = append(errs, fmt.Errorf(format, a...)) }

	kind := str(b["kind"])
	if !exerciseKinds[kind] {
		return []error{fmt.Errorf("exercise.kind %q không hợp lệ", kind)}
	}
	if str(b["prompt"]) == "" {
		add("thiếu prompt")
	}
	if p, ok := toInt(b["points"]); !ok || p <= 0 {
		add("points phải > 0")
	}
	ans, ok := b["answer"].(map[string]any)
	if !ok {
		add("thiếu answer")
		return errs
	}
	optIDs := map[string]bool{}
	if opts, ok := b["options"].([]any); ok {
		for _, o := range opts {
			if m, ok := o.(map[string]any); ok {
				optIDs[str(m["id"])] = true
			}
		}
	}

	switch kind {
	case "mcq", "listen_choose":
		if kind == "listen_choose" {
			if l, ok := b["listen"].(map[string]any); !ok || str(l["text"]) == "" {
				add("listen_choose cần listen.text (từ cần nghe)")
			}
		}
		correct := strList(ans["correct"])
		if len(optIDs) < 2 {
			add("cần ít nhất 2 options")
		}
		if len(correct) == 0 {
			add("answer.correct rỗng")
		}
		for _, id := range correct {
			if !optIDs[id] {
				add("answer.correct %q không có trong options", id)
			}
		}
	case "fill_blank", "typing":
		if len(strList(ans["accept"])) == 0 && str(ans["text"]) == "" {
			add("answer.accept rỗng")
		}
	case "order":
		seq := strList(ans["sequence"])
		if len(seq) < 2 {
			add("answer.sequence cần ≥ 2 phần tử")
		}
		if len(seq) != len(optIDs) {
			add("answer.sequence (%d) và options (%d) khác số lượng", len(seq), len(optIDs))
		}
		for _, id := range seq {
			if !optIDs[id] {
				add("answer.sequence %q không có trong options", id)
			}
		}
	case "match":
		pairs, _ := ans["pairs"].([]any)
		if len(pairs) < 2 {
			add("answer.pairs cần ≥ 2 cặp")
		}
	case "true_false":
		if _, ok := ans["correct"].(bool); !ok {
			add("answer.correct phải là true/false")
		}
	}
	return errs
}

// validateSay kiểm tra trường `say` (lời đọc thay thế): chuỗi, hoặc danh sách đoạn {t, l}.
func validateSay(v any) []error {
	switch x := v.(type) {
	case nil, string:
		return nil
	case []any:
		var errs []error
		for i, it := range x {
			m, ok := it.(map[string]any)
			if !ok || str(m["t"]) == "" {
				errs = append(errs, fmt.Errorf("say[%d]: cần dạng {t: \"...\", l: vi|en}", i))
				continue
			}
			if l := str(m["l"]); l != "" && l != "vi" && l != "en" {
				errs = append(errs, fmt.Errorf("say[%d]: l %q không hợp lệ", i, l))
			}
		}
		return errs
	}
	return []error{fmt.Errorf("say phải là chuỗi hoặc danh sách đoạn")}
}

func str(v any) string {
	s, _ := v.(string)
	return strings.TrimSpace(s)
}

func strList(v any) []string {
	arr, _ := v.([]any)
	out := make([]string, 0, len(arr))
	for _, x := range arr {
		if s, ok := x.(string); ok && s != "" {
			out = append(out, s)
		}
	}
	return out
}

func toInt(v any) (int, bool) {
	switch n := v.(type) {
	case int:
		return n, true
	case int64:
		return int(n), true
	case float64:
		return int(n), true
	}
	return 0, false
}

// ValidSlug: slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang.
func ValidSlug(s string) bool { return slugRe.MatchString(s) }

// ValidStatus: trạng thái nội dung hợp lệ (draft, review, published, archived).
func ValidStatus(s string) bool { return statuses[s] }
