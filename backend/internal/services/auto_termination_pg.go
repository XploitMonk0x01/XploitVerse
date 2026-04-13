package services

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// AutoTerminationServicePG checks PostgreSQL-backed sessions and terminates expired ones.
type AutoTerminationServicePG struct {
	DB        *pgxpool.Pool
	DockerSvc *DockerService
	Interval  time.Duration
}

func NewAutoTerminationServicePG(db *pgxpool.Pool, dockerSvc *DockerService) *AutoTerminationServicePG {
	return &AutoTerminationServicePG{
		DB:        db,
		DockerSvc: dockerSvc,
		Interval:  2 * time.Minute,
	}
}

func (s *AutoTerminationServicePG) Start(ctx context.Context) {
	go func() {
		ticker := time.NewTicker(s.Interval)
		defer ticker.Stop()

		log.Println("🕐 Postgres auto-termination service started")

		for {
			select {
			case <-ctx.Done():
				log.Println("🕐 Postgres auto-termination service stopped")
				return
			case <-ticker.C:
				s.checkExpiredSessions(ctx)
			}
		}
	}()
}

func (s *AutoTerminationServicePG) checkExpiredSessions(ctx context.Context) {
	rows, err := s.DB.Query(ctx, `
		SELECT id, COALESCE(target_container_id,''), COALESCE(network_name,'')
		FROM lab_sessions
		WHERE status IN ('running','initializing')
			AND expires_at IS NOT NULL
			AND expires_at <= now()
	`)
	if err != nil {
		log.Printf("❌ PG auto-termination query failed: %v", err)
		return
	}
	defer rows.Close()

	type expiredSession struct {
		id          int64
		containerID string
		networkName string
	}

	expired := make([]expiredSession, 0)
	for rows.Next() {
		var e expiredSession
		if err := rows.Scan(&e.id, &e.containerID, &e.networkName); err != nil {
			continue
		}
		expired = append(expired, e)
	}

	for _, sExp := range expired {
		if s.DockerSvc != nil && sExp.containerID != "" {
			_ = s.DockerSvc.StopContainer(ctx, sExp.containerID)
		}
		if s.DockerSvc != nil && sExp.networkName != "" {
			_ = s.DockerSvc.RemoveNetwork(ctx, sExp.networkName)
		}

		_, _ = s.DB.Exec(ctx, `
			UPDATE lab_sessions
			SET status='terminated', updated_at=now()
			WHERE id=$1
		`, sExp.id)
	}

	if len(expired) > 0 {
		log.Printf("⏰ Auto-terminated %d expired PostgreSQL sessions", len(expired))
	}
}
