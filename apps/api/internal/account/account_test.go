package account

import (
	"strings"
	"testing"
)

func TestProfileValidate(t *testing.T) {
	ok := []profileInput{
		{DisplayName: "Bi", Grade: 1}, {DisplayName: "  Minh   Anh ", AvatarKey: "cat", Grade: 9},
		{DisplayName: strings.Repeat("ê", 20), Grade: 5},
	}
	for _, in := range ok {
		in := in
		if msg := in.validate(); msg != "" {
			t.Errorf("%+v rejected: %s", in, msg)
		}
	}
	bads := map[string]profileInput{
		"empty":      {DisplayName: "   ", Grade: 3},
		"too long":   {DisplayName: strings.Repeat("a", 21), Grade: 3},
		"html":       {DisplayName: "<b>x</b>", Grade: 3},
		"control":    {DisplayName: "a\x00b", Grade: 3},
		"grade low":  {DisplayName: "Bi", Grade: 0},
		"grade high": {DisplayName: "Bi", Grade: 10},
		"avatar":     {DisplayName: "Bi", Grade: 3, AvatarKey: "../../etc"},
	}
	for name, in := range bads {
		in := in
		if in.validate() == "" {
			t.Errorf("%s: should be rejected", name)
		}
	}
	in := profileInput{DisplayName: " Minh   Anh ", Grade: 2}
	in.validate()
	if in.DisplayName != "Minh Anh" || in.AvatarKey != defaultAvatar {
		t.Errorf("normalise: %+v", in)
	}
}

func TestPinRegexp(t *testing.T) {
	for _, p := range []string{"1234", "123456", "0000"} {
		if !pinRe.MatchString(p) {
			t.Errorf("%s should be valid", p)
		}
	}
	for _, p := range []string{"", "123", "1234567", "12a4", "12 34", "١٢٣٤"} {
		if pinRe.MatchString(p) {
			t.Errorf("%q should be invalid", p)
		}
	}
}
