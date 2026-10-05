// Package events is an in-process fan-out bus for SSE notifications.
package events

import (
	"sync"

	"github.com/google/uuid"
)

// Event is a single notification routed to one user.
type Event struct {
	Type    string
	UserID  uuid.UUID
	Payload any
}

// Bus fans events out to per-user subscribers.
type Bus interface {
	Publish(Event)
	Subscribe(userID uuid.UUID) (<-chan Event, func())
}

const subscriberBuffer = 32

type bus struct {
	mu   sync.RWMutex
	subs map[uuid.UUID]map[int]chan Event
	next int
}

// New returns an in-process Bus.
func New() Bus {
	return &bus{subs: map[uuid.UUID]map[int]chan Event{}}
}

// Publish delivers an event to every subscriber of its user without blocking:
// a full subscriber buffer is dropped.
func (b *bus) Publish(e Event) {
	b.mu.RLock()
	defer b.mu.RUnlock()
	for _, ch := range b.subs[e.UserID] {
		select {
		case ch <- e:
		default:
		}
	}
}

// Subscribe returns a channel of events for userID and a cancel func. Cancel
// removes the subscriber and closes its channel; it is safe to call once.
func (b *bus) Subscribe(userID uuid.UUID) (<-chan Event, func()) {
	b.mu.Lock()
	ch := make(chan Event, subscriberBuffer)
	id := b.next
	b.next++
	if b.subs[userID] == nil {
		b.subs[userID] = map[int]chan Event{}
	}
	b.subs[userID][id] = ch
	b.mu.Unlock()

	var once sync.Once
	cancel := func() {
		once.Do(func() {
			b.mu.Lock()
			defer b.mu.Unlock()
			if m := b.subs[userID]; m != nil {
				if c, ok := m[id]; ok {
					delete(m, id)
					close(c)
				}
				if len(m) == 0 {
					delete(b.subs, userID)
				}
			}
		})
	}
	return ch, cancel
}
