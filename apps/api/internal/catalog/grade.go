package catalog

import (
	"sort"
	"strings"

	"golang.org/x/text/unicode/norm"
)

// norm chuẩn hoá chuỗi để so sánh: NFC, bỏ khoảng trắng thừa, chữ thường.
// Giữ nguyên dấu tiếng Việt (chính tả "ba" ≠ "bà" ≠ "bá" là điều bài học cần phân biệt).
func normText(s string) string {
	return strings.ToLower(strings.Join(strings.Fields(norm.NFC.String(s)), " "))
}

// Grade chấm một bài tập. block là block `exercise` gốc (có answer); resp là câu trả lời của học sinh.
// ok=false nghĩa là dạng bài chưa hỗ trợ chấm tự động hoặc câu trả lời sai định dạng.
func Grade(block, resp map[string]any) (correct bool, ok bool) {
	ans, _ := block["answer"].(map[string]any)
	if ans == nil {
		return false, false
	}
	switch s(block["kind"]) {
	case "mcq", "listen_choose":
		got, ok := strSlice(resp["selected"])
		if !ok {
			return false, false
		}
		want, _ := strSlice(ans["correct"])
		return sameSet(got, want), true

	case "fill_blank", "typing":
		text, isStr := resp["text"].(string)
		if !isStr {
			return false, false
		}
		got := normText(text)
		if got == "" {
			return false, true
		}
		accept, _ := strSlice(ans["accept"])
		if t := s(ans["text"]); t != "" {
			accept = append(accept, t)
		}
		for _, a := range accept {
			if normText(a) == got {
				return true, true
			}
		}
		return false, true

	case "order":
		got, ok := strSlice(resp["sequence"])
		if !ok {
			return false, false
		}
		want, _ := strSlice(ans["sequence"])
		if len(got) != len(want) {
			return false, true
		}
		for i := range got {
			if got[i] != want[i] {
				return false, true
			}
		}
		return true, true

	case "match":
		gotPairs, ok := pairList(resp["pairs"])
		if !ok {
			return false, false
		}
		wantPairs, _ := pairList(ans["pairs"])
		return sameSet(gotPairs, wantPairs), true

	case "true_false":
		v, isBool := resp["value"].(bool)
		want, _ := ans["correct"].(bool)
		if !isBool {
			return false, false
		}
		return v == want, true
	}
	return false, false
}

func s(v any) string { x, _ := v.(string); return x }

func strSlice(v any) ([]string, bool) {
	arr, isArr := v.([]any)
	if !isArr {
		return nil, false
	}
	out := make([]string, 0, len(arr))
	for _, x := range arr {
		str, isStr := x.(string)
		if !isStr {
			return nil, false
		}
		out = append(out, str)
	}
	return out, true
}

// pairList đổi [["a","b"],...] thành ["a\x00b",...] để so sánh như tập hợp.
func pairList(v any) ([]string, bool) {
	arr, isArr := v.([]any)
	if !isArr {
		return nil, false
	}
	out := make([]string, 0, len(arr))
	for _, x := range arr {
		p, isArr := x.([]any)
		if !isArr || len(p) != 2 {
			return nil, false
		}
		l, ok1 := p[0].(string)
		r, ok2 := p[1].(string)
		if !ok1 || !ok2 {
			return nil, false
		}
		out = append(out, l+"\x00"+r)
	}
	return out, true
}

func sameSet(a, b []string) bool {
	if len(a) != len(b) {
		return false
	}
	x := append([]string(nil), a...)
	y := append([]string(nil), b...)
	sort.Strings(x)
	sort.Strings(y)
	for i := range x {
		if x[i] != y[i] {
			return false
		}
	}
	return true
}

// ExplanationFor chỉ trả lời giải thích khi trả lời đúng: lời giải thích thường nói ra đáp án,
// nên không được lộ ra khi học sinh còn đang đoán.
func ExplanationFor(block map[string]any, correct bool) string {
	if !correct {
		return ""
	}
	return s(block["explanation"])
}

// Sanitize trả về bản của block an toàn để gửi cho trình duyệt: bỏ đáp án và lời giải,
// và với bài nối cặp thì tách hai cột (cột phải được sắp xếp lại để không lộ thứ tự đúng).
func Sanitize(block map[string]any) map[string]any {
	if s(block["type"]) != "exercise" {
		return block
	}
	out := make(map[string]any, len(block))
	for k, v := range block {
		if k == "answer" || k == "explanation" || k == "pairs" {
			continue
		}
		out[k] = v
	}
	if s(block["kind"]) == "match" {
		var left, right []string
		if arr, ok := block["pairs"].([]any); ok {
			for _, p := range arr {
				if m, ok := p.(map[string]any); ok {
					left = append(left, s(m["left"]))
					right = append(right, s(m["right"]))
				}
			}
		}
		sort.Strings(right)
		out["left"], out["right"] = left, right
	}
	return out
}
