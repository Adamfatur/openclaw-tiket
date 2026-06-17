package user

import (
	"encoding/json"
	"net/http"

	"github.com/Adamfatur/openclaw-tiket/backend/internal/auth"
	"github.com/Adamfatur/openclaw-tiket/backend/internal/db"
	"github.com/go-chi/chi/v5"
	"golang.org/x/crypto/bcrypt"
)

type Service struct {
	db *db.DB
}

type User struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Name      string `json:"name"`
	Role      string `json:"role"`
	IsActive  bool   `json:"is_active"`
	CreatedAt string `json:"created_at"`
}

type CreateUserRequest struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Password string `json:"password"`
	RoleID   int    `json:"role_id"`
}

func NewService(database *db.DB) *Service {
	return &Service{db: database}
}

func (s *Service) GetMeHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var user User
	err := s.db.Pool.QueryRow(r.Context(),
		`SELECT u.id, u.email, u.name, r.name, u.is_active, u.created_at::text
		 FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
		claims.UserID).Scan(&user.ID, &user.Email, &user.Name, &user.Role, &user.IsActive, &user.CreatedAt)
	if err != nil {
		http.Error(w, `{"error":"user not found"}`, http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(user)
}

func (s *Service) UpdateMeHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	var body struct {
		Name string `json:"name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	_, err := s.db.Pool.Exec(r.Context(),
		`UPDATE users SET name = $1, updated_at = NOW() WHERE id = $2`,
		body.Name, claims.UserID)
	if err != nil {
		http.Error(w, `{"error":"update failed"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"message":"updated"}`))
}

func (s *Service) ListHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Pool.Query(r.Context(),
		`SELECT u.id, u.email, u.name, r.name, u.is_active, u.created_at::text
		 FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.created_at DESC`)
	if err != nil {
		http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	users := make([]User, 0)
	for rows.Next() {
		var u User
		if err := rows.Scan(&u.ID, &u.Email, &u.Name, &u.Role, &u.IsActive, &u.CreatedAt); err != nil {
			continue
		}
		users = append(users, u)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(users)
}

func (s *Service) CreateHandler(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), 12)
	if err != nil {
		http.Error(w, `{"error":"hash failed"}`, http.StatusInternalServerError)
		return
	}

	var userID string
	err = s.db.Pool.QueryRow(r.Context(),
		`INSERT INTO users (email, name, password_hash, role_id) VALUES ($1, $2, $3, $4) RETURNING id`,
		req.Email, req.Name, string(hash), req.RoleID).Scan(&userID)
	if err != nil {
		http.Error(w, `{"error":"create failed, email may already exist"}`, http.StatusConflict)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": userID, "email": req.Email})
}

func (s *Service) DeleteHandler(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	_, err := s.db.Pool.Exec(r.Context(),
		`UPDATE users SET is_active = false, updated_at = NOW() WHERE id = $1`, id)
	if err != nil {
		http.Error(w, `{"error":"delete failed"}`, http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
