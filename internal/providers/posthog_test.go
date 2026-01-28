package providers

import "testing"

func TestEscapeHogQLLike(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			name:  "plain domain",
			input: "example.com",
			want:  "example.com",
		},
		{
			name:  "single quote injection",
			input: "example'; DROP TABLE events; --",
			want:  "example''; DROP TABLE events; --",
		},
		{
			name:  "percent wildcard",
			input: "100% done",
			want:  `100\% done`,
		},
		{
			name:  "underscore wildcard",
			input: "my_domain.com",
			want:  `my\_domain.com`,
		},
		{
			name:  "backslash",
			input: `path\to\file`,
			want:  `path\\to\\file`,
		},
		{
			name:  "all special chars",
			input: `it's 100% my_site\path`,
			want:  `it''s 100\% my\_site\\path`,
		},
		{
			name:  "empty string",
			input: "",
			want:  "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := escapeHogQLLike(tt.input)
			if got != tt.want {
				t.Errorf("escapeHogQLLike(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}
