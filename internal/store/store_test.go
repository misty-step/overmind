package store

import (
	"context"
	"os"
	"path/filepath"
	"reflect"
	"testing"
	"time"

	"github.com/phaedrus/overmind/internal/domain"
)

func openTestStore(t *testing.T, path string) *Store {
	t.Helper()

	store, err := Open(path)
	if err != nil {
		t.Fatalf("Open(%q) error = %v", path, err)
	}
	t.Cleanup(func() {
		_ = store.Close()
	})
	return store
}

func TestOpen(t *testing.T) {
	tests := []struct {
		name string
		fn   func(t *testing.T)
	}{
		{
			name: "creates db file",
			fn: func(t *testing.T) {
				dir := t.TempDir()
				path := filepath.Join(dir, "metrics.db")

				store := openTestStore(t, path)
				_ = store.Close()

				if _, err := os.Stat(path); err != nil {
					t.Fatalf("expected db file at %s: %v", path, err)
				}
			},
		},
		{
			name: "runs migrations",
			fn: func(t *testing.T) {
				store := openTestStore(t, ":memory:")

				row := store.db.QueryRow(`
					SELECT name
					FROM sqlite_master
					WHERE type = 'table' AND name = 'metrics_snapshots'
				`)
				var name string
				if err := row.Scan(&name); err != nil {
					t.Fatalf("expected metrics_snapshots table: %v", err)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, tt.fn)
	}
}

func TestSaveMetrics(t *testing.T) {
	tests := []struct {
		name string
		fn   func(t *testing.T)
	}{
		{
			name: "rejects nil",
			fn: func(t *testing.T) {
				store := openTestStore(t, ":memory:")
				if err := store.SaveMetrics(context.Background(), nil); err == nil {
					t.Fatalf("SaveMetrics() error = nil, want error")
				}
			},
		},
		{
			name: "inserts metrics",
			fn: func(t *testing.T) {
				store := openTestStore(t, ":memory:")
				err := store.SaveMetrics(context.Background(), &domain.Metrics{
					ProductName: "App",
					Timestamp:   time.Unix(100, 0),
					Visits:      12,
				})
				if err != nil {
					t.Fatalf("SaveMetrics() error = %v", err)
				}

				row := store.db.QueryRow(`SELECT COUNT(*) FROM metrics_snapshots`)
				var count int
				if err := row.Scan(&count); err != nil {
					t.Fatalf("count metrics_snapshots error = %v", err)
				}
				if count != 1 {
					t.Fatalf("metrics_snapshots count = %d, want 1", count)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, tt.fn)
	}
}

func TestGetLatestMetrics(t *testing.T) {
	tests := []struct {
		name string
		fn   func(t *testing.T)
	}{
		{
			name: "returns most recent",
			fn: func(t *testing.T) {
				store := openTestStore(t, ":memory:")
				ctx := context.Background()

				metrics := []domain.Metrics{
					{ProductName: "App", Timestamp: time.Unix(100, 0), Visits: 5},
					{ProductName: "App", Timestamp: time.Unix(200, 0), Visits: 10},
				}
				for i := range metrics {
					if err := store.SaveMetrics(ctx, &metrics[i]); err != nil {
						t.Fatalf("SaveMetrics() error = %v", err)
					}
				}

				got, err := store.GetLatestMetrics(ctx, "App")
				if err != nil {
					t.Fatalf("GetLatestMetrics() error = %v", err)
				}
				if got == nil {
					t.Fatalf("GetLatestMetrics() = nil, want metrics")
				}
				want := &domain.Metrics{
					ProductName: "App",
					Timestamp:   time.Unix(200, 0),
					Visits:      10,
				}
				if !reflect.DeepEqual(got, want) {
					t.Fatalf("GetLatestMetrics() = %#v, want %#v", got, want)
				}
			},
		},
		{
			name: "returns nil for missing product",
			fn: func(t *testing.T) {
				store := openTestStore(t, ":memory:")

				got, err := store.GetLatestMetrics(context.Background(), "missing")
				if err != nil {
					t.Fatalf("GetLatestMetrics() error = %v", err)
				}
				if got != nil {
					t.Fatalf("GetLatestMetrics() = %#v, want nil", got)
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, tt.fn)
	}
}

func TestGetMetricsRange(t *testing.T) {
	tests := []struct {
		name string
		fn   func(t *testing.T)
	}{
		{
			name: "returns ordered results within range",
			fn: func(t *testing.T) {
				store := openTestStore(t, ":memory:")
				ctx := context.Background()

				metrics := []domain.Metrics{
					{ProductName: "App", Timestamp: time.Unix(100, 0), Visits: 1},
					{ProductName: "App", Timestamp: time.Unix(200, 0), Visits: 2},
					{ProductName: "App", Timestamp: time.Unix(300, 0), Visits: 3},
					{ProductName: "Other", Timestamp: time.Unix(200, 0), Visits: 99},
				}
				for i := range metrics {
					if err := store.SaveMetrics(ctx, &metrics[i]); err != nil {
						t.Fatalf("SaveMetrics() error = %v", err)
					}
				}

				from := time.Unix(100, 0)
				to := time.Unix(300, 0)

				got, err := store.GetMetricsRange(ctx, "App", from, to)
				if err != nil {
					t.Fatalf("GetMetricsRange() error = %v", err)
				}
				want := []*domain.Metrics{
					{ProductName: "App", Timestamp: time.Unix(100, 0), Visits: 1},
					{ProductName: "App", Timestamp: time.Unix(200, 0), Visits: 2},
					{ProductName: "App", Timestamp: time.Unix(300, 0), Visits: 3},
				}
				if !reflect.DeepEqual(got, want) {
					t.Fatalf("GetMetricsRange() = %#v, want %#v", got, want)
				}
			},
		},
		{
			name: "empty for no matches",
			fn: func(t *testing.T) {
				store := openTestStore(t, ":memory:")
				ctx := context.Background()

				if err := store.SaveMetrics(ctx, &domain.Metrics{
					ProductName: "App",
					Timestamp:   time.Unix(100, 0),
					Visits:      1,
				}); err != nil {
					t.Fatalf("SaveMetrics() error = %v", err)
				}

				got, err := store.GetMetricsRange(ctx, "Missing", time.Unix(0, 0), time.Unix(500, 0))
				if err != nil {
					t.Fatalf("GetMetricsRange() error = %v", err)
				}
				if len(got) != 0 {
					t.Fatalf("GetMetricsRange() len = %d, want 0", len(got))
				}
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, tt.fn)
	}
}
