package pool

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
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

// ClawContainerURLs maps slot numbers to container internal URLs
var ClawContainerURLs = map[int]string{
	1: "http://claw-1:3000",
	2: "http://claw-2:3000",
	3: "http://claw-3:3000",
}

// DispatchTask sends a booking task to the assigned claw container
func (m *Manager) DispatchTask(slotNumber int, task BookingTask) error {
	url, ok := ClawContainerURLs[slotNumber]
	if !ok {
		return fmt.Errorf("unknown slot number: %d", slotNumber)
	}

	body, err := json.Marshal(task)
	if err != nil {
		return fmt.Errorf("marshal task: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "POST", url+"/task", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		slog.Error("dispatch task failed", "slot", slotNumber, "error", err)
		return fmt.Errorf("dispatch to claw-%d: %w", slotNumber, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("claw-%d rejected task: status %d", slotNumber, resp.StatusCode)
	}

	slog.Info("task dispatched to claw",
		"slot", slotNumber,
		"booking_id", task.BookingID,
		"event", task.EventName,
	)

	return nil
}

// HealthCheck pings a claw container
func (m *Manager) HealthCheck(slotNumber int) bool {
	url, ok := ClawContainerURLs[slotNumber]
	if !ok {
		return false
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, "GET", url+"/health", nil)
	if err != nil {
		return false
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return false
	}
	defer resp.Body.Close()

	return resp.StatusCode == http.StatusOK
}
