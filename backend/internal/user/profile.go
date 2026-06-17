package user

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"io"
	"net/http"
	"os"

	"github.com/Adamfatur/openclaw-tiket/backend/internal/auth"
)

type Profile struct {
	Title        string `json:"title"`
	FullName     string `json:"full_name"`
	Phone        string `json:"phone"`
	ContactEmail string `json:"contact_email"`
	IDNumber     string `json:"id_number"`
	Nationality  string `json:"nationality"`
}

type PlatformCredential struct {
	Platform   string `json:"platform"`
	Email      string `json:"email"`
	Password   string `json:"password,omitempty"`   // Only for input
	IsVerified bool   `json:"is_verified"`
	HasCreds   bool   `json:"has_credentials"`
}

func (s *Service) GetProfileHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())

	var p Profile
	err := s.db.Pool.QueryRow(r.Context(),
		`SELECT COALESCE(title,''), COALESCE(full_name,''), COALESCE(phone,''), 
		 COALESCE(contact_email,''), COALESCE(id_number,''), COALESCE(nationality,'Indonesia')
		 FROM user_profiles WHERE user_id = $1`, claims.UserID).
		Scan(&p.Title, &p.FullName, &p.Phone, &p.ContactEmail, &p.IDNumber, &p.Nationality)
	if err != nil {
		// No profile yet, return empty
		p = Profile{Title: "Tuan", Nationality: "Indonesia"}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(p)
}

func (s *Service) UpdateProfileHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())

	var p Profile
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, `{"error":"invalid body"}`, http.StatusBadRequest)
		return
	}

	_, err := s.db.Pool.Exec(r.Context(),
		`INSERT INTO user_profiles (user_id, title, full_name, phone, contact_email, id_number, nationality, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		 ON CONFLICT (user_id) DO UPDATE SET
		   title = $2, full_name = $3, phone = $4, contact_email = $5, 
		   id_number = $6, nationality = $7, updated_at = NOW()`,
		claims.UserID, p.Title, p.FullName, p.Phone, p.ContactEmail, p.IDNumber, p.Nationality)
	if err != nil {
		http.Error(w, `{"error":"failed to save profile"}`, http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "saved"})
}

func (s *Service) GetCredentialsHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())

	rows, err := s.db.Pool.Query(r.Context(),
		`SELECT platform, email, is_verified FROM platform_credentials WHERE user_id = $1`, claims.UserID)
	if err != nil {
		http.Error(w, `{"error":"query failed"}`, http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	creds := make([]PlatformCredential, 0)
	for rows.Next() {
		var c PlatformCredential
		if err := rows.Scan(&c.Platform, &c.Email, &c.IsVerified); err != nil {
			continue
		}
		c.HasCreds = true
		creds = append(creds, c)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(creds)
}

func (s *Service) SaveCredentialHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())

	var body struct {
		Platform string `json:"platform"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Email == "" || body.Password == "" {
		http.Error(w, `{"error":"email and password are required"}`, http.StatusBadRequest)
		return
	}

	if body.Platform == "" {
		body.Platform = "tiket.com"
	}

	// Encrypt password
	encrypted, err := encrypt(body.Password, getEncryptionKey())
	if err != nil {
		http.Error(w, `{"error":"encryption failed"}`, http.StatusInternalServerError)
		return
	}

	_, err = s.db.Pool.Exec(r.Context(),
		`INSERT INTO platform_credentials (user_id, platform, email, password_enc, updated_at)
		 VALUES ($1, $2, $3, $4, NOW())
		 ON CONFLICT (user_id, platform) DO UPDATE SET
		   email = $3, password_enc = $4, updated_at = NOW()`,
		claims.UserID, body.Platform, body.Email, encrypted)
	if err != nil {
		http.Error(w, `{"error":"failed to save credentials"}`, http.StatusInternalServerError)
		return
	}

	// Audit log
	s.db.Pool.Exec(r.Context(),
		`INSERT INTO audit_logs (user_id, action, resource, ip_address) VALUES ($1, 'credential:save', $2, $3)`,
		claims.UserID, body.Platform, r.RemoteAddr)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "saved"})
}

func (s *Service) DeleteCredentialHandler(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetClaims(r.Context())

	var body struct {
		Platform string `json:"platform"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		body.Platform = "tiket.com"
	}

	s.db.Pool.Exec(r.Context(),
		`DELETE FROM platform_credentials WHERE user_id = $1 AND platform = $2`,
		claims.UserID, body.Platform)

	w.WriteHeader(http.StatusNoContent)
}

// --- Encryption helpers ---

func getEncryptionKey() []byte {
	key := os.Getenv("JWT_SECRET") // Reuse JWT secret as AES key base
	// Pad/truncate to 32 bytes for AES-256
	k := make([]byte, 32)
	copy(k, []byte(key))
	return k
}

func encrypt(plaintext string, key []byte) (string, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := aesGCM.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}
