// Command seed creates the Free plan (via migrations), a dev user, and one API
// key, then prints the plaintext key once.
package main

import (
	"context"
	"fmt"
	"os"

	"github.com/google/uuid"

	"indotunnel/internal/auth"
	"indotunnel/internal/config"
	"indotunnel/internal/db"
)

func main() {
	ctx := context.Background()
	cfg, err := config.Load()
	if err != nil {
		fail(err)
	}
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		fail(err)
	}
	defer pool.Close()
	if err := db.Migrate(ctx, pool, "migrations"); err != nil {
		fail(err)
	}

	var planID uuid.UUID
	if err := pool.QueryRow(ctx, `SELECT id FROM plans WHERE code='free'`).Scan(&planID); err != nil {
		fail(err)
	}

	const email = "dev@indotunnel.id"
	var userID uuid.UUID
	err = pool.QueryRow(ctx, `SELECT id FROM users WHERE email=$1`, email).Scan(&userID)
	if err != nil {
		userID = uuid.New()
		if _, err := pool.Exec(ctx,
			`INSERT INTO users (id, plan_id, email, name) VALUES ($1,$2,$3,$4)`,
			userID, planID, email, "Dev"); err != nil {
			fail(err)
		}
	}

	plaintext, prefix, hash := auth.GenerateKey()
	if _, err := pool.Exec(ctx,
		`INSERT INTO api_keys (id, user_id, name, key_prefix, secret_hash)
		 VALUES ($1,$2,$3,$4,$5)`,
		uuid.New(), userID, "seed", prefix, hash); err != nil {
		fail(err)
	}

	fmt.Println(plaintext)
}

func fail(err error) {
	fmt.Fprintln(os.Stderr, "seed:", err)
	os.Exit(1)
}
