package user

import (
	"encoding/json"
	"net/http"

	"github.com/Adamfatur/openclaw-tiket/backend/internal/auth"
)

type PaymentMethod struct {
	ID         string `json:"id"`
	MethodType string `json:"method_type"`
	Label      string `json:"label"`
	IsDefault  bool   `json:"is_default"`
	CardName   string `json:"card_name,omitempty"`
	HasCard    bool   `json:"has_card"`
}

type SavePaymentRequest struct {
	MethodType string `json:"method_type"` // bca_va, mandiri_va, credit_card, gopay, etc.
	Label      string `json:"label"`
	IsDefault  bool   `json:"is_default"`
	// CC fields (optional, only for credit_card)
	CardNumber string `json:"card_number,omitempty"`
	CardExpiry string `json:"card_expiry,omitempty"`
	CardCVV    string `json:"card_cvv,omitempty"`
	CardName   string `json:"card_name,omitempty"`
}

func (s *Service) ListPaymentMethodsHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())

	rows, err := s.db.Pool.Query(r.Context(),
		`SELECT id, method_type, COALESCE(label,''), is_default, COALESCE(card_name,''), 
		 (card_number_enc IS NOT NULL) as has_card
		 FROM payment_methods WHERE user_id = $1 ORDER BY is_default DESC, created_at`, claims.UserID)
	if err != nil {
		http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	methods := make([]PaymentMethod, 0)
	for rows.Next() {
		var m PaymentMethod
		if err := rows.Scan(&m.ID, &m.MethodType, &m.Label, &m.IsDefault, &m.CardName, &m.HasCard); err != nil {
			continue
		}
		methods = append(methods, m)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(methods)
}

func (s *Service) SavePaymentMethodHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())

	var req SavePaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.MethodType == "" {
		http.Error(w, `{"error":"method_type is required"}`, http.StatusBadRequest)
		return
	}

	if req.Label == "" {
		labels := map[string]string{
			"bca_va":      "BCA Virtual Account",
			"mandiri_va":  "Mandiri Virtual Account",
			"bni_va":      "BNI Virtual Account",
			"credit_card": "Kartu Kredit/Debit",
			"gopay":       "GoPay",
			"dana":        "DANA",
			"shopeepay":   "ShopeePay",
		}
		req.Label = labels[req.MethodType]
		if req.Label == "" {
			req.Label = req.MethodType
		}
	}

	// If setting as default, unset others first
	if req.IsDefault {
		s.db.Pool.Exec(r.Context(),
			`UPDATE payment_methods SET is_default = false WHERE user_id = $1`, claims.UserID)
	}

	var cardNumEnc, cardExpEnc, cardCvvEnc *string
	if req.MethodType == "credit_card" && req.CardNumber != "" {
		key := getEncryptionKey()
		enc1, _ := encrypt(req.CardNumber, key)
		enc2, _ := encrypt(req.CardExpiry, key)
		enc3, _ := encrypt(req.CardCVV, key)
		cardNumEnc = &enc1
		cardExpEnc = &enc2
		cardCvvEnc = &enc3
	}

	_, err := s.db.Pool.Exec(r.Context(),
		`INSERT INTO payment_methods (user_id, method_type, label, is_default, card_number_enc, card_expiry_enc, card_cvv_enc, card_name)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT (user_id, method_type, label) DO UPDATE SET
		   is_default = $4, card_number_enc = COALESCE($5, payment_methods.card_number_enc),
		   card_expiry_enc = COALESCE($6, payment_methods.card_expiry_enc),
		   card_cvv_enc = COALESCE($7, payment_methods.card_cvv_enc),
		   card_name = COALESCE($8, payment_methods.card_name), updated_at = NOW()`,
		claims.UserID, req.MethodType, req.Label, req.IsDefault, cardNumEnc, cardExpEnc, cardCvvEnc, req.CardName)
	if err != nil {
		http.Error(w, `{"error":"failed to save payment method"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "saved"})
}

func (s *Service) DeletePaymentMethodHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())

	var body struct {
		ID string `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.ID == "" {
		http.Error(w, `{"error":"id required"}`, http.StatusBadRequest)
		return
	}

	s.db.Pool.Exec(r.Context(),
		`DELETE FROM payment_methods WHERE id=$1 AND user_id=$2`, body.ID, claims.UserID)
	w.WriteHeader(http.StatusNoContent)
}
