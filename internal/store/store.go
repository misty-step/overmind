package store

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	"github.com/phaedrus/overmind/internal/domain"
	_ "modernc.org/sqlite"
)

type Store struct {
	db *sql.DB
}

// DefaultPath returns ~/.overmind/cache/metrics.db
func DefaultPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("store: resolve home dir: %w", err)
	}
	return filepath.Join(home, ".overmind", "cache", "metrics.db"), nil
}

// Open opens or creates the SQLite database
func Open(path string) (*Store, error) {
	if path == "" {
		defaultPath, err := DefaultPath()
		if err != nil {
			return nil, err
		}
		path = defaultPath
	}

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, fmt.Errorf("store: create dir %s: %w", dir, err)
	}

	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("store: open %s: %w", path, err)
	}

	store := &Store{db: db}
	if err := store.migrate(); err != nil {
		_ = db.Close()
		return nil, err
	}

	return store, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

// SaveMetrics inserts a metrics snapshot
func (s *Store) SaveMetrics(ctx context.Context, m *domain.Metrics) error {
	if m == nil {
		return fmt.Errorf("store: metrics is nil")
	}

	_, err := s.db.ExecContext(ctx, `
		INSERT INTO metrics_snapshots (
			product_name,
			timestamp,
			visits,
			uniques,
			bounce_rate,
			mrr,
			subscribers,
			health_status,
			response_time
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, m.ProductName, m.Timestamp.Unix(), m.Visits, m.Uniques, m.BounceRate, m.MRR, m.Subscribers, m.HealthStatus, m.ResponseTime)
	if err != nil {
		return fmt.Errorf("store: insert metrics: %w", err)
	}

	return nil
}

// GetLatestMetrics returns the most recent metrics for a product
func (s *Store) GetLatestMetrics(ctx context.Context, productName string) (*domain.Metrics, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT
			product_name,
			timestamp,
			COALESCE(visits, 0),
			COALESCE(uniques, 0),
			COALESCE(bounce_rate, 0),
			COALESCE(mrr, 0),
			COALESCE(subscribers, 0),
			COALESCE(health_status, ''),
			COALESCE(response_time, 0)
		FROM metrics_snapshots
		WHERE product_name = ?
		ORDER BY timestamp DESC
		LIMIT 1
	`, productName)

	var (
		name         string
		ts           int64
		visits       int64
		uniques      int64
		bounceRate   float64
		mrr          int64
		subscribers  int64
		healthStatus string
		responseTime int64
	)

	if err := row.Scan(&name, &ts, &visits, &uniques, &bounceRate, &mrr, &subscribers, &healthStatus, &responseTime); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, fmt.Errorf("store: select latest metrics: %w", err)
	}

	return &domain.Metrics{
		ProductName:  name,
		Timestamp:    time.Unix(ts, 0),
		Visits:       visits,
		Uniques:      uniques,
		BounceRate:   bounceRate,
		MRR:          mrr,
		Subscribers:  subscribers,
		HealthStatus: healthStatus,
		ResponseTime: responseTime,
	}, nil
}

// GetMetricsRange returns metrics for a product within a time range (for charts)
func (s *Store) GetMetricsRange(ctx context.Context, productName string, from, to time.Time) ([]*domain.Metrics, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT
			product_name,
			timestamp,
			COALESCE(visits, 0),
			COALESCE(uniques, 0),
			COALESCE(bounce_rate, 0),
			COALESCE(mrr, 0),
			COALESCE(subscribers, 0),
			COALESCE(health_status, ''),
			COALESCE(response_time, 0)
		FROM metrics_snapshots
		WHERE product_name = ?
			AND timestamp BETWEEN ? AND ?
		ORDER BY timestamp
	`, productName, from.Unix(), to.Unix())
	if err != nil {
		return nil, fmt.Errorf("store: select metrics range: %w", err)
	}
	defer rows.Close()

	var metrics []*domain.Metrics
	for rows.Next() {
		var (
			name         string
			ts           int64
			visits       int64
			uniques      int64
			bounceRate   float64
			mrr          int64
			subscribers  int64
			healthStatus string
			responseTime int64
		)

		if err := rows.Scan(&name, &ts, &visits, &uniques, &bounceRate, &mrr, &subscribers, &healthStatus, &responseTime); err != nil {
			return nil, fmt.Errorf("store: scan metrics range: %w", err)
		}

		metrics = append(metrics, &domain.Metrics{
			ProductName:  name,
			Timestamp:    time.Unix(ts, 0),
			Visits:       visits,
			Uniques:      uniques,
			BounceRate:   bounceRate,
			MRR:          mrr,
			Subscribers:  subscribers,
			HealthStatus: healthStatus,
			ResponseTime: responseTime,
		})
	}

	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("store: iterate metrics range: %w", err)
	}

	return metrics, nil
}

// migrate creates the schema if it doesn't exist
func (s *Store) migrate() error {
	if _, err := s.db.Exec(`
		CREATE TABLE IF NOT EXISTS metrics_snapshots (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			product_name TEXT NOT NULL,
			timestamp INTEGER NOT NULL,
			visits INTEGER DEFAULT 0,
			uniques INTEGER DEFAULT 0,
			bounce_rate REAL DEFAULT 0,
			mrr INTEGER DEFAULT 0,
			subscribers INTEGER DEFAULT 0,
			health_status TEXT DEFAULT '',
			response_time INTEGER DEFAULT 0,
			created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
		);
	`); err != nil {
		return fmt.Errorf("store: migrate schema: %w", err)
	}

	if _, err := s.db.Exec(`
		CREATE INDEX IF NOT EXISTS idx_metrics_product_time
		ON metrics_snapshots(product_name, timestamp DESC);
	`); err != nil {
		return fmt.Errorf("store: migrate index: %w", err)
	}

	return nil
}
