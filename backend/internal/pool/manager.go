package pool

import (
	"encoding/json"
	"net/http"
	"sync"
)

type SlotStatus string

const (
	SlotIdle  SlotStatus = "idle"
	SlotBusy  SlotStatus = "busy"
	SlotError SlotStatus = "error"
)

type Slot struct {
	Number    int        `json:"number"`
	Status    SlotStatus `json:"status"`
	UserID    string     `json:"user_id,omitempty"`
	BookingID string     `json:"booking_id,omitempty"`
}

type PoolStatus struct {
	Total       int  `json:"total"`
	Active      int  `json:"active"`
	QueueLength int  `json:"queue_length"`
	Slots       []Slot `json:"slots"`
}

type QueueItem struct {
	UserID    string
	BookingID string
}

type Manager struct {
	mu       sync.RWMutex
	maxSlots int
	slots    []Slot
	queue    []QueueItem
}

func NewManager(maxSlots int) *Manager {
	slots := make([]Slot, maxSlots)
	for i := range slots {
		slots[i] = Slot{Number: i + 1, Status: SlotIdle}
	}
	return &Manager{
		maxSlots: maxSlots,
		slots:    slots,
		queue:    make([]QueueItem, 0),
	}
}

func (m *Manager) Assign(userID, bookingID string) (int, bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	for i := range m.slots {
		if m.slots[i].Status == SlotIdle {
			m.slots[i].Status = SlotBusy
			m.slots[i].UserID = userID
			m.slots[i].BookingID = bookingID
			return m.slots[i].Number, true
		}
	}

	// No slot available, add to queue
	m.queue = append(m.queue, QueueItem{UserID: userID, BookingID: bookingID})
	return 0, false
}

func (m *Manager) Release(slotNumber int) *QueueItem {
	m.mu.Lock()
	defer m.mu.Unlock()

	for i := range m.slots {
		if m.slots[i].Number == slotNumber {
			m.slots[i].Status = SlotIdle
			m.slots[i].UserID = ""
			m.slots[i].BookingID = ""
			break
		}
	}

	// Check queue
	if len(m.queue) > 0 {
		next := m.queue[0]
		m.queue = m.queue[1:]
		return &next
	}

	return nil
}

func (m *Manager) QueuePosition(bookingID string) int {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for i, item := range m.queue {
		if item.BookingID == bookingID {
			return i + 1
		}
	}
	return 0
}

func (m *Manager) Status() PoolStatus {
	m.mu.RLock()
	defer m.mu.RUnlock()

	active := 0
	for _, s := range m.slots {
		if s.Status == SlotBusy {
			active++
		}
	}

	return PoolStatus{
		Total:       m.maxSlots,
		Active:      active,
		QueueLength: len(m.queue),
		Slots:       m.slots,
	}
}

func (m *Manager) StatusHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(m.Status())
}
