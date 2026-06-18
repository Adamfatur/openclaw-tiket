package pool

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

type BookingTask struct {
	BookingID      string   `json:"booking_id"`
	EventURL       string   `json:"event_url"`
	EventName      string   `json:"event_name"`
	TicketCategory string   `json:"ticket_category"`
	Quantity       int      `json:"quantity"`
	Notes          string   `json:"notes"`
	PaymentMethod  string   `json:"payment_method"`
	GuestIDs       []string `json:"guest_ids"`
}

// OpenClaw gateway token (internal, set via docker-compose env)
const clawGatewayToken = "apaaja-pastibisa-internal-2026"

// ClawContainerURLs maps slot numbers to OpenClaw gateway URLs
var ClawContainerURLs = map[int]string{
	1: "http://claw-1:18789",
	2: "http://claw-2:18789",
	3: "http://claw-3:18789",
}

// DispatchTask sends a booking task to OpenClaw as a natural language message
func (m *Manager) DispatchTask(slotNumber int, task BookingTask) error {
	url, ok := ClawContainerURLs[slotNumber]
	if !ok {
		return fmt.Errorf("unknown slot number: %d", slotNumber)
	}

	// Construct natural language instruction for OpenClaw
	instruction := fmt.Sprintf(
		`Tolong booking tiket event berikut di tiket.com:

Event: %s
URL: %s
Kategori/Paket: %s
Jumlah Tiket: %d
Metode Pembayaran: %s

Catatan tambahan: %s

Booking ID (internal): %s

Ikuti skill "tiket-booking" yang sudah terinstall. Setelah sampai halaman pembayaran, STOP dan laporkan detail (total harga, order ID, nomor VA jika ada). Jangan lanjutkan pembayaran tanpa konfirmasi.`,
		task.EventName, task.EventURL, task.TicketCategory,
		task.Quantity, task.PaymentMethod, task.Notes, task.BookingID,
	)

	// Send to OpenClaw gateway via POST /api/v1/message
	payload := map[string]interface{}{
		"channel":           "api",
		"message":           instruction,
		"wait_for_response": false, // Don't block — let it run async
		"timeout_ms":        600000, // 10 minutes
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshal message: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", url+"/api/v1/message", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+clawGatewayToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		slog.Error("dispatch to OpenClaw failed", "slot", slotNumber, "error", err)
		return fmt.Errorf("dispatch to claw-%d: %w", slotNumber, err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 400 {
		slog.Error("OpenClaw rejected task", "slot", slotNumber, "status", resp.StatusCode, "body", string(respBody))
		return fmt.Errorf("claw-%d rejected: status %d", slotNumber, resp.StatusCode)
	}

	slog.Info("task dispatched to OpenClaw",
		"slot", slotNumber,
		"booking_id", task.BookingID,
		"event", task.EventName,
		"response_status", resp.StatusCode,
	)

	return nil
}

// HealthCheck pings OpenClaw gateway health endpoint
func (m *Manager) HealthCheck(slotNumber int) bool {
	url, ok := ClawContainerURLs[slotNumber]
	if !ok {
		return false
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", url+"/api/v1/health", nil)
	if err != nil {
		return false
	}
	req.Header.Set("Authorization", "Bearer "+clawGatewayToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}

// GetConversations retrieves active conversations from a claw container
func (m *Manager) GetConversations(slotNumber int) ([]map[string]interface{}, error) {
	url, ok := ClawContainerURLs[slotNumber]
	if !ok {
		return nil, fmt.Errorf("unknown slot: %d", slotNumber)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", url+"/api/v1/conversations", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+clawGatewayToken)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	return result, nil
}
