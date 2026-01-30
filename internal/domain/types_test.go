package domain

import "testing"

func TestComputeSignal(t *testing.T) {
	tests := []struct {
		name string
		m    Metrics
		want Signal
	}{
		{
			name: "traction when visits over 100",
			m:    Metrics{Visits: 101},
			want: SignalTraction,
		},
		{
			name: "dead when visits under 10 and no revenue",
			m:    Metrics{Visits: 0, MRR: 0},
			want: SignalDead,
		},
		{
			name: "neutral when visits 100",
			m:    Metrics{Visits: 100},
			want: SignalNeutral,
		},
		{
			name: "neutral when visits 10 with revenue",
			m:    Metrics{Visits: 10, MRR: 500},
			want: SignalNeutral,
		},
		{
			name: "neutral when visits 9 with revenue",
			m:    Metrics{Visits: 9, MRR: 500},
			want: SignalNeutral,
		},
		{
			name: "neutral otherwise",
			m:    Metrics{Visits: 50, MRR: 0},
			want: SignalNeutral,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.m.ComputeSignal()
			if got != tt.want {
				t.Errorf("ComputeSignal() = %q, want %q", got, tt.want)
			}
		})
	}
}
