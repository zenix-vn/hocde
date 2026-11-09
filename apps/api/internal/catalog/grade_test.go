package catalog

import (
	"encoding/json"
	"testing"
)

func j(t *testing.T, s string) map[string]any {
	t.Helper()
	var m map[string]any
	if err := json.Unmarshal([]byte(s), &m); err != nil {
		t.Fatal(err)
	}
	return m
}

func TestGrade(t *testing.T) {
	cases := []struct {
		name      string
		block     string
		resp      string
		wantOK    bool
		wantRight bool
	}{
		{"mcq đúng", `{"kind":"mcq","answer":{"correct":["b"]}}`, `{"selected":["b"]}`, true, true},
		{"mcq sai", `{"kind":"mcq","answer":{"correct":["b"]}}`, `{"selected":["a"]}`, true, false},
		{"mcq sai định dạng", `{"kind":"mcq","answer":{"correct":["b"]}}`, `{"selected":"b"}`, false, false},
		{"điền: không phân biệt hoa/thường và khoảng trắng", `{"kind":"fill_blank","answer":{"accept":["ò","o"]}}`, `{"text":"  Ò "}`, true, true},
		{"điền: sai dấu thanh", `{"kind":"fill_blank","answer":{"accept":["ò"]}}`, `{"text":"ó"}`, true, false},
		{"điền: rỗng", `{"kind":"fill_blank","answer":{"accept":["a"]}}`, `{"text":""}`, true, false},
		{"điền: dấu tổ hợp (NFD) vẫn khớp", `{"kind":"fill_blank","answer":{"accept":["ò"]}}`, "{\"text\":\"ò\"}", true, true},
		{"sắp xếp đúng", `{"kind":"order","answer":{"sequence":["x2","x1"]}}`, `{"sequence":["x2","x1"]}`, true, true},
		{"sắp xếp sai", `{"kind":"order","answer":{"sequence":["x2","x1"]}}`, `{"sequence":["x1","x2"]}`, true, false},
		{"nối cặp đúng (khác thứ tự)", `{"kind":"match","answer":{"pairs":[["a","1"],["b","2"]]}}`, `{"pairs":[["b","2"],["a","1"]]}`, true, true},
		{"nối cặp sai", `{"kind":"match","answer":{"pairs":[["a","1"],["b","2"]]}}`, `{"pairs":[["a","2"],["b","1"]]}`, true, false},
		{"đúng/sai", `{"kind":"true_false","answer":{"correct":true}}`, `{"value":true}`, true, true},
		{"dạng chưa hỗ trợ", `{"kind":"hotspot","answer":{"regions":[]}}`, `{}`, false, false},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			right, ok := Grade(j(t, c.block), j(t, c.resp))
			if ok != c.wantOK || right != c.wantRight {
				t.Fatalf("ok=%v right=%v, muốn ok=%v right=%v", ok, right, c.wantOK, c.wantRight)
			}
		})
	}
}

func TestExplanationOnlyWhenCorrect(t *testing.T) {
	b := map[string]any{"explanation": "vì sao"}
	if got := ExplanationFor(b, false); got != "" {
		t.Errorf("trả lời sai không được lộ giải thích, nhận %q", got)
	}
	if got := ExplanationFor(b, true); got != "vì sao" {
		t.Errorf("trả lời đúng phải có giải thích, nhận %q", got)
	}
}

func TestSanitizeHidesAnswers(t *testing.T) {
	b := j(t, `{"id":"e","type":"exercise","kind":"mcq","prompt":"?","hint":"gợi ý",
		"answer":{"correct":["a"]},"explanation":"vì sao"}`)
	out := Sanitize(b)
	for _, k := range []string{"answer", "explanation"} {
		if _, has := out[k]; has {
			t.Errorf("%q không được lộ ra client", k)
		}
	}
	if out["hint"] != "gợi ý" || out["prompt"] != "?" {
		t.Error("phải giữ lại prompt và hint")
	}
	if _, has := b["answer"]; !has {
		t.Error("không được sửa block gốc")
	}
}

func TestSanitizeMatchHidesCorrectOrder(t *testing.T) {
	b := j(t, `{"id":"m","type":"exercise","kind":"match","pairs":[
		{"left":"bà","right":"huyền"},{"left":"bá","right":"sắc"},{"left":"bạ","right":"nặng"}],
		"answer":{"pairs":[["bà","huyền"]]}}`)
	out := Sanitize(b)
	if _, has := out["pairs"]; has {
		t.Fatal("pairs lộ đáp án")
	}
	left := out["left"].([]string)
	right := out["right"].([]string)
	if len(left) != 3 || len(right) != 3 {
		t.Fatalf("left=%v right=%v", left, right)
	}
	if right[0] != "huyền" || right[1] != "nặng" || right[2] != "sắc" {
		t.Errorf("cột phải phải được sắp xếp lại: %v", right)
	}
}
