// Package reqlog records request metadata asynchronously so the data path
// never blocks on persistence.
package reqlog

import (
	"context"
	"sync/atomic"
	"time"

	"github.com/google/uuid"

	"indotunnel/internal/store"
)

// Inserter persists a batch of request logs.
type Inserter interface {
	InsertRequestLogs(ctx context.Context, logs []store.RequestLog) error
}

// BandwidthAdder adds transferred bytes to a user's monthly counter.
type BandwidthAdder interface {
	AddBandwidth(ctx context.Context, userID string, bytes int64) error
}

// Record is one request's metadata. Field names mirror store.RequestLog.
type Record struct {
	RequestID     string
	TunnelID      uuid.UUID
	UserID        uuid.UUID
	Method        string
	Path          string
	Host          string
	StatusCode    int
	RequestBytes  int64
	ResponseBytes int64
	DurationMS    int
	ClientIPHash  string
	StartedAt     time.Time
}

// Logger buffers records and flushes them in batches.
type Logger struct {
	ins      Inserter
	bw       BandwidthAdder
	ch       chan Record
	dropped  atomic.Int64
	stopped  chan struct{}
	flushInt time.Duration
	batch    int
}

// New builds a Logger with the given buffer size.
func New(ins Inserter, bw BandwidthAdder, bufSize int) *Logger {
	if bufSize < 1 {
		bufSize = 1
	}
	l := &Logger{
		ins:      ins,
		bw:       bw,
		ch:       make(chan Record, bufSize),
		stopped:  make(chan struct{}),
		flushInt: 500 * time.Millisecond,
		batch:    100,
	}
	go l.loop()
	return l
}

// Record enqueues a record without ever blocking the caller.
func (l *Logger) Record(r Record) {
	select {
	case l.ch <- r:
	default:
		l.dropped.Add(1)
	}
}

// Dropped returns how many records were dropped because the buffer was full.
func (l *Logger) Dropped() int64 { return l.dropped.Load() }

func (l *Logger) loop() {
	defer close(l.stopped)
	ticker := time.NewTicker(l.flushInt)
	defer ticker.Stop()
	var buf []Record
	flush := func() {
		if len(buf) == 0 {
			return
		}
		l.persist(buf)
		buf = buf[:0]
	}
	for {
		select {
		case r, ok := <-l.ch:
			if !ok {
				flush()
				return
			}
			buf = append(buf, r)
			if len(buf) >= l.batch {
				flush()
			}
		case <-ticker.C:
			flush()
		}
	}
}

func (l *Logger) persist(buf []Record) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	logs := make([]store.RequestLog, 0, len(buf))
	for _, r := range buf {
		logs = append(logs, store.RequestLog{
			ID:            uuid.New(),
			TunnelID:      r.TunnelID,
			UserID:        r.UserID,
			RequestID:     r.RequestID,
			Method:        r.Method,
			Path:          r.Path,
			Host:          r.Host,
			StatusCode:    r.StatusCode,
			RequestBytes:  r.RequestBytes,
			ResponseBytes: r.ResponseBytes,
			DurationMS:    r.DurationMS,
			ClientIPHash:  r.ClientIPHash,
			StartedAt:     r.StartedAt,
		})
	}
	_ = l.ins.InsertRequestLogs(ctx, logs)

	for _, r := range buf {
		if l.bw != nil && r.UserID != uuid.Nil {
			_ = l.bw.AddBandwidth(ctx, r.UserID.String(), r.RequestBytes+r.ResponseBytes)
		}
	}
}

// Close drains pending records and stops the loop.
func (l *Logger) Close(ctx context.Context) error {
	close(l.ch)
	select {
	case <-l.stopped:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}
