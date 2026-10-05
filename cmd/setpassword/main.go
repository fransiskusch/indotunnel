// Command setpassword sets (or resets) a user's password hash from the EMAIL
// and PASSWORD environment variables. It prints nothing secret.
package main

import (
	"context"
	"fmt"
	"os"

	"indotunnel/internal/auth"
	"indotunnel/internal/config"
	"indotunnel/internal/db"
	"indotunnel/internal/store"
)

func main() {
	email := os.Getenv("EMAIL")
	password := os.Getenv("PASSWORD")
	if email == "" || password == "" {
		fail("EMAIL and PASSWORD are required")
	}

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
	st := store.New(pool)

	user, err := st.UserByEmail(ctx, email)
	if err != nil {
		fail(fmt.Errorf("user %q not found", email))
	}
	hash, err := auth.HashPassword(password, cfg.BcryptCost)
	if err != nil {
		fail(err)
	}
	if err := st.UpdatePasswordHash(ctx, user.ID, hash); err != nil {
		fail(err)
	}
	fmt.Printf("password set for %s\n", email)
}

func fail(err any) {
	fmt.Fprintln(os.Stderr, "setpassword:", err)
	os.Exit(1)
}
