package booking

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/Adamfatur/openclaw-tiket/backend/internal/auth"
	"github.com/Adamfatur/openclaw-tiket/backend/internal/db"
	"github.com/Adamfatur/openclaw-tiket/backend/internal/pool"
	"github.com/Adamfatur/openclaw-tiket/backend/internal/ws"
	"github.com/go-chi/chi/v5"
	"github.com/redis/go-redis/v9"
)

type Service struct {
	db    *db.DB
	redis *redis.Client
	pool  *pool.Manager
	hub   *ws.Hub
}

type CreateBookingRequest struct {
	EventName      string `json:"event_name"`
	EventURL       string `json:"event_url"`
	TicketCategory string `json:"ticket_category"`
	Quantity       int    `json:"quantity"`
	Notes          string `json:"notes,omitempty"`
}

type Booking struct {
	ID             string          `json:"id"`
	UserID         string          `json:"user_id"`
	Status         string          `json:"status"`
	Platform       string          `json:"platform"`
	EventName      string          `json:"event_name"`
	EventURL       string          `json:"event_url"`
	TicketCategory string          `json:"ticket_category"`
	Quantity       int             `json:"quantity"`
	Notes          *string         `json:"notes,omitempty"`
	Result         json.RawMessage `json:"result,omitempty"`
	QueuePosition  *int            `json:"queue_position,omitempty"`
	CreatedAt      string          `json:"created_at"`
	UpdatedAt      string          `json:"updated_at"`
}

func NewService(database *db.DB, redisClient *redis.Client, poolMgr *pool.Manager, hub *ws.Hub) *Service {
	return &Service{
		db:    database,
		redis: redisClient,
		pool:  poolMgr,
		hub:   hub,
	}
}

func (s *Service) CreateHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	if claims == nil {
		http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
		return
	}

	var req CreateBookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, `{"error":"invalid request body"}`, http.StatusBadRequest)
		return
	}

	if req.EventName == "" || req.EventURL == "" || req.TicketCategory == "" {
		http.Error(w, `{"error":"event_name, event_url, and ticket_category are required"}`, http.StatusBadRequest)
		return
	}

	if req.Quantity < 1 || req.Quantity > 4 {
		http.Error(w, `{"error":"quantity must be between 1 and 4"}`, http.StatusBadRequest)
		return
	}

	var bookingID string
	err := s.db.Pool.QueryRow(r.Context(),
		`INSERT INTO bookings (user_id, status, platform, event_name, event_url, ticket_category, quantity, notes)
		 VALUES ($1, 'queued', 'tiket.com', $2, $3, $4, $5, $6) RETURNING id`,
		claims.UserID, req.EventName, req.EventURL, req.TicketCategory, req.Quantity, req.Notes,
	).Scan(&bookingID)
	if err != nil {
		slog.Error("create booking failed", "error", err)
		http.Error(w, `{"error":"failed to create booking"}`, http.StatusInternalServerError)
		return
	}

	slotNumber, assigned := s.pool.Assign(claims.UserID, bookingID)

	if assigned {
		s.db.Pool.Exec(r.Context(),
			`UPDATE bookings SET status = 'in_progress', updated_at = NOW() WHERE id = $1`, bookingID)

		slog.Info("booking assigned to slot", "booking_id", bookingID, "slot", slotNumber)

		s.hub.SendToUser(claims.UserID, ws.Message{
			Type:      "booking_update",
			BookingID: bookingID,
			Status:    "in_progress",
			Message:   "Booking sedang diproses oleh agent",
		})
	} else {
		queuePos := s.pool.QueuePosition(bookingID)
		s.db.Pool.Exec(r.Context(),
			`UPDATE bookings SET queue_position = $1, updated_at = NOW() WHERE id = $2`, queuePos, bookingID)

		s.hub.SendToUser(claims.UserID, ws.Message{
			Type:      "booking_update",
			BookingID: bookingID,
			Status:    "queued",
			Message:   fmt.Sprintf("Dalam antrian, posisi ke-%d", queuePos),
		})
	}

	// Audit
	s.db.Pool.Exec(r.Context(),
		`INSERT INTO audit_logs (user_id, action, resource, details, ip_address)
		 VALUES ($1, 'booking:create', $2, $3, $4)`,
		claims.UserID, bookingID,
		json.RawMessage(`{"event":"`+req.EventName+`","category":"`+req.TicketCategory+`"}`),
		r.RemoteAddr)

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]interface{}{
		"id":       bookingID,
		"status":   map[bool]string{true: "in_progress", false: "queued"}[assigned],
		"slot":     slotNumber,
		"assigned": assigned,
	})
}

func (s *Service) ListHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())

	var query string
	var args []interface{}
	if claims.Role == "admin" {
		query = `SELECT id, user_id, status, platform, event_name, event_url, ticket_category, quantity, result, created_at::text, updated_at::text 
				 FROM bookings ORDER BY created_at DESC LIMIT 50`
	} else {
		query = `SELECT id, user_id, status, platform, event_name, event_url, ticket_category, quantity, result, created_at::text, updated_at::text 
				 FROM bookings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`
		args = append(args, claims.UserID)
	}

	rows, err := s.db.Pool.Query(r.Context(), query, args...)
	if err != nil {
		http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	bookings := make([]Booking, 0)
	for rows.Next() {
		var b Booking
		if err := rows.Scan(&b.ID, &b.UserID, &b.Status, &b.Platform, &b.EventName,
			&b.EventURL, &b.TicketCategory, &b.Quantity, &b.Result, &b.CreatedAt, &b.UpdatedAt); err != nil {
			continue
		}
		bookings = append(bookings, b)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(bookings)
}

func (s *Service) GetHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	id := chi.URLParam(r, "id")

	var b Booking
	err := s.db.Pool.QueryRow(r.Context(),
		`SELECT id, user_id, status, platform, event_name, event_url, ticket_category, quantity, notes, result, created_at::text, updated_at::text
		 FROM bookings WHERE id = $1`, id).
		Scan(&b.ID, &b.UserID, &b.Status, &b.Platform, &b.EventName, &b.EventURL,
			&b.TicketCategory, &b.Quantity, &b.Notes, &b.Result, &b.CreatedAt, &b.UpdatedAt)
	if err != nil {
		http.Error(w, `{"error":"booking not found"}`, http.StatusNotFound)
		return
	}

	if claims.Role != "admin" && b.UserID != claims.UserID {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(b)
}

func (s *Service) ConfirmHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	id := chi.URLParam(r, "id")

	var userID, status string
	err := s.db.Pool.QueryRow(r.Context(),
		`SELECT user_id, status FROM bookings WHERE id = $1`, id).Scan(&userID, &status)
	if err != nil {
		http.Error(w, `{"error":"booking not found"}`, http.StatusNotFound)
		return
	}

	if userID != claims.UserID && claims.Role != "admin" {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	if status != "awaiting_confirmation" {
		http.Error(w, `{"error":"booking is not awaiting confirmation"}`, http.StatusBadRequest)
		return
	}

	s.db.Pool.Exec(r.Context(),
		`UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE id = $1`, id)

	s.hub.SendToUser(claims.UserID, ws.Message{
		Type:      "booking_update",
		BookingID: id,
		Status:    "confirmed",
		Message:   "Payment dikonfirmasi, melanjutkan proses...",
	})

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "confirmed"})
}

func (s *Service) CancelHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())
	id := chi.URLParam(r, "id")

	var userID, status string
	err := s.db.Pool.QueryRow(r.Context(),
		`SELECT user_id, status FROM bookings WHERE id = $1`, id).Scan(&userID, &status)
	if err != nil {
		http.Error(w, `{"error":"booking not found"}`, http.StatusNotFound)
		return
	}

	if userID != claims.UserID && claims.Role != "admin" {
		http.Error(w, `{"error":"forbidden"}`, http.StatusForbidden)
		return
	}

	if status != "queued" && status != "in_progress" {
		http.Error(w, `{"error":"cannot cancel booking in this state"}`, http.StatusBadRequest)
		return
	}

	s.db.Pool.Exec(r.Context(),
		`UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`, id)

	s.db.Pool.Exec(r.Context(),
		`INSERT INTO audit_logs (user_id, action, resource) VALUES ($1, 'booking:cancel', $2)`,
		claims.UserID, id)

	w.WriteHeader(http.StatusNoContent)
}

func (s *Service) ClawCallbackHandler(w http.ResponseWriter, r *http.Request) {
	var callback struct {
		BookingID  string          `json:"booking_id"`
		SlotNumber int             `json:"slot_number"`
		Status     string          `json:"status"`
		Step       int             `json:"step"`
		Message    string          `json:"message"`
		Result     json.RawMessage `json:"result,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&callback); err != nil {
		http.Error(w, `{"error":"invalid callback"}`, http.StatusBadRequest)
		return
	}

	slog.Info("claw callback", "booking_id", callback.BookingID, "status", callback.Status, "step", callback.Step)

	if callback.Status != "" {
		s.db.Pool.Exec(r.Context(),
			`UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2`,
			callback.Status, callback.BookingID)
	}

	if callback.Result != nil {
		s.db.Pool.Exec(r.Context(),
			`UPDATE bookings SET result = $1, updated_at = NOW() WHERE id = $2`,
			callback.Result, callback.BookingID)
	}

	if callback.Step > 0 {
		s.db.Pool.Exec(r.Context(),
			`INSERT INTO booking_steps (booking_id, step_number, action, message, status)
			 VALUES ($1, $2, $3, $4, 'completed')`,
			callback.BookingID, callback.Step, callback.Status, callback.Message)
	}

	var userID string
	s.db.Pool.QueryRow(r.Context(),
		`SELECT user_id FROM bookings WHERE id = $1`, callback.BookingID).Scan(&userID)

	if userID != "" {
		s.hub.SendToUser(userID, ws.Message{
			Type:      "booking_update",
			BookingID: callback.BookingID,
			Status:    callback.Status,
			Step:      callback.Step,
			Message:   callback.Message,
		})
	}

	if callback.Status == "completed" || callback.Status == "failed" {
		next := s.pool.Release(callback.SlotNumber)
		if next != nil {
			slog.Info("assigning queued booking", "booking_id", next.BookingID)
		}
	}

	w.WriteHeader(http.StatusOK)
}

func (s *Service) AuditHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := s.db.Pool.Query(r.Context(),
		`SELECT id, user_id, action, resource, details, ip_address::text, created_at::text
		 FROM audit_logs ORDER BY created_at DESC LIMIT 100`)
	if err != nil {
		http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	type AuditLog struct {
		ID        string          `json:"id"`
		UserID    string          `json:"user_id"`
		Action    string          `json:"action"`
		Resource  *string         `json:"resource"`
		Details   json.RawMessage `json:"details"`
		IP        *string         `json:"ip_address"`
		CreatedAt string          `json:"created_at"`
	}

	logs := make([]AuditLog, 0)
	for rows.Next() {
		var l AuditLog
		if err := rows.Scan(&l.ID, &l.UserID, &l.Action, &l.Resource, &l.Details, &l.IP, &l.CreatedAt); err != nil {
			continue
		}
		logs = append(logs, l)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(logs)
}
