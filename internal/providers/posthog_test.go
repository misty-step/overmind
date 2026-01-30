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

func TestNewPostHogClient_HostValidation(t *testing.T) {
	tests := []struct {
		name string
		host string
		want string
	}{
		{
			name: "empty host defaults",
			host: "",
			want: "https://us.i.posthog.com",
		},
		{
			name: "http upgraded to https",
			host: "http://example.com",
			want: "https://example.com",
		},
		{
			name: "https kept",
			host: "https://app.posthog.com",
			want: "https://app.posthog.com",
		},
		{
			name: "bare host gets https",
			host: "us.i.posthog.com",
			want: "https://us.i.posthog.com",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			client := NewPostHogClient("key", "proj", tt.host)
			if client.host != tt.want {
				t.Errorf("NewPostHogClient host = %q, want %q", client.host, tt.want)
			}
		})
	}
}
