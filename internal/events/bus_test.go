package events

import (
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestFanOut(t *testing.T) {
	b := New()
	u := uuid.New()
	ch1, cancel1 := b.Subscribe(u)
	ch2, cancel2 := b.Subscribe(u)
	defer cancel1()
	defer cancel2()

	b.Publish(Event{Type: "request", UserID: u})
	for _, ch := range []<-chan Event{ch1, ch2} {
		select {
		case e := <-ch:
			if e.Type != "request" {
				t.Fatalf("type=%q", e.Type)
			}
		case <-time.After(time.Second):
			t.Fatal("subscriber did not receive event")
		}
	}
}

func TestPublishDoesNotBlockOnSlowSubscriber(t *testing.T) {
	b := New()
	u := uuid.New()
	_, cancel := b.Subscribe(u)
	defer cancel()
	done := make(chan struct{})
	go func() {
		for i := 0; i < 10000; i++ {
			b.Publish(Event{Type: "request", UserID: u})
		}
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("Publish blocked on a slow subscriber")
	}
}

func TestUserIsolation(t *testing.T) {
	b := New()
	a, cancelA := b.Subscribe(uuid.New())
	defer cancelA()
	b.Publish(Event{Type: "request", UserID: uuid.New()})
	select {
	case <-a:
		t.Fatal("received another user's event")
	case <-time.After(100 * time.Millisecond):
	}
}
