package reqlog

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"indotunnel/internal/store"
)

type fakeInserter struct {
	mu   sync.Mutex
	rows []store.RequestLog
	done chan struct{}
}

func (f *fakeInserter) InsertRequestLogs(ctx context.Context, logs []store.RequestLog) error {
	f.mu.Lock()
	f.rows = append(f.rows, logs...)
	f.mu.Unlock()
	if f.done != nil {
		select {
		case f.done <- struct{}{}:
		default:
		}
	}
	return nil
}

type fakeBw struct {
	mu    sync.Mutex
	bytes int64
}

func (f *fakeBw) AddBandwidth(ctx context.Context, userID string, b int64) error {
	f.mu.Lock()
	f.bytes += b
	f.mu.Unlock()
	return nil
}

func TestDropsWhenFullNotBlock(t *testing.T) {
	l := New(&fakeInserter{}, &fakeBw{}, 1)
	done := make(chan struct{})
	go func() {
		for i := 0; i < 1000; i++ {
			l.Record(Record{})
		}
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("Record blocked when buffer full")
	}
}

func TestFlushInsertsAndCountsBandwidth(t *testing.T) {
	ins := &fakeInserter{}
	bw := &fakeBw{}
	l := New(ins, bw, 10)
	l.Record(Record{RequestID: "r1", RequestBytes: 100, ResponseBytes: 40, UserID: uuid.New()})
	l.Record(Record{RequestID: "r2", RequestBytes: 10, ResponseBytes: 5, UserID: uuid.New()})
	if err := l.Close(context.Background()); err != nil {
		t.Fatal(err)
	}
	ins.mu.Lock()
	n := len(ins.rows)
	ins.mu.Unlock()
	if n != 2 {
		t.Fatalf("rows=%d", n)
	}
	bw.mu.Lock()
	total := bw.bytes
	bw.mu.Unlock()
	if total != 155 {
		t.Fatalf("bandwidth=%d", total)
	}
}
