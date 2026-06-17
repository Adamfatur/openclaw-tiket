package user

import (
	"encoding/json"
	"net/http"

	"github.com/Adamfatur/openclaw-tiket/backend/internal/auth"
	"github.com/go-chi/chi/v5"
)

type Guest struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Title       string `json:"title"`
	FullName    string `json:"full_name"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	IDNumber    string `json:"id_number"`
	Nationality string `json:"nationality"`
}

func (s *Service) ListGuestsHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())

	rows, err := s.db.Pool.Query(r.Context(),
		`SELECT id, COALESCE(label,''), COALESCE(title,'Tuan'), full_name, 
		 COALESCE(phone,''), COALESCE(email,''), COALESCE(id_number,''), COALESCE(nationality,'Indonesia')
		 FROM saved_guests WHERE user_id = $1 ORDER BY created_at`, claims.UserID)
	if err != nil {
		http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	guests := make([]Guest, 0)
	for rows.Next() {
		var g Guest
		if err := rows.Scan(&g.ID, &g.Label, &g.Title, &g.FullName, &g.Phone, &g.Email, &g.IDNumber, &g.Nationality); err != nil {
			continue
		}
		guests = append(guests, g)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(guests)
}

func (s *Service) CreateGuestHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())

	var g Guest
	if err := json.NewDecoder(r.Body).Decode(&g); err != nil || g.FullName == "" {
		http.Error(w, `{"error":"full_name is required"}`, http.StatusBadRequest)
		return
	}

	var id string
	err := s.db.Pool.QueryRow(r.Context(),
		`INSERT INTO saved_guests (user_id, label, title, full_name, phone, email, id_number, nationality)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
		claims.UserID, g.Label, g.Title, g.FullName, g.Phone, g.Email, g.IDNumber, g.Nationality).Scan(&id)
	if err != nil {
		http.Error(w, `{"error":"failed to save guest"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"id": id})
}

func (s *Service) UpdateGuestHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	id := chi.URLParam(r, "id")

	var g Guest
	if err := json.NewDecoder(r.Body).Decode(&g); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	_, err := s.db.Pool.Exec(r.Context(),
		`UPDATE saved_guests SET label=$1, title=$2, full_name=$3, phone=$4, email=$5, id_number=$6, nationality=$7, updated_at=NOW()
		 WHERE id=$8 AND user_id=$9`,
		g.Label, g.Title, g.FullName, g.Phone, g.Email, g.IDNumber, g.Nationality, id, claims.UserID)
	if err != nil {
		http.Error(w, `{"error":"update failed"}`, http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(`{"status":"updated"}`))
}

func (s *Service) DeleteGuestHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	id := chi.URLParam(r, "id")

	s.db.Pool.Exec(r.Context(),
		`DELETE FROM saved_guests WHERE id=$1 AND user_id=$2`, id, claims.UserID)
	w.WriteHeader(http.StatusNoContent)
}
