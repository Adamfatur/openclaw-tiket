package db

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"

	"golang.org/x/crypto/bcrypt"
)

func (d *DB) RunMigrations(ctx context.Context, migrationsDir string) error {
	files, err := filepath.Glob(filepath.Join(migrationsDir, "*.sql"))
	if err != nil {
		return err
	}

	for _, f := range files {
		slog.Info("running migration", "file", filepath.Base(f))
		sql, err := os.ReadFile(f)
		if err != nil {
			return err
		}
		if _, err := d.Pool.Exec(ctx, string(sql)); err != nil {
			slog.Warn("migration may have already been applied", "file", filepath.Base(f), "error", err.Error())
		}
	}

	return nil
}

func (d *DB) SeedAdmin(ctx context.Context, email, password string) error {
	// Check if admin exists
	var count int
	d.Pool.QueryRow(ctx, "SELECT COUNT(*) FROM users WHERE email = $1", email).Scan(&count)
	if count > 0 {
		slog.Info("admin user already exists", "email", email)
		return nil
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	if err != nil {
		return err
	}

	_, err = d.Pool.Exec(ctx,
		`INSERT INTO users (email, name, password_hash, role_id) 
		 VALUES ($1, 'Admin', $2, (SELECT id FROM roles WHERE name = 'admin'))`,
		email, string(hash))
	if err != nil {
		return err
	}

	slog.Info("admin user created", "email", email)
	return nil
}
