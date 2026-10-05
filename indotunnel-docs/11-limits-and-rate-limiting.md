# Limits and Rate Limiting

## 1. Free Plan Limits

```text
Active tunnel:        1
Requests:              5,000/day
Bandwidth:             10 GB/month
```

## 2. Why Account-Based Tunnel Limit

Do not enforce `1 public IP = 1 tunnel` as the primary rule.

Reasons:

- office networks use NAT
- university/coworking networks use NAT
- multiple developers can share one IP
- IPv6 behavior differs from IPv4
- mobile carrier NAT can put many users behind one address

Recommended:

```text
1 account = 1 active tunnel
```

and separately:

```text
IP = abuse signal
```

## 3. Daily Request Enforcement

Flow:

```text
incoming request
      |
      v
identify user/tunnel
      |
      v
Redis INCR daily counter
      |
      +---- >= 5000 --> 429
      |
      +---- <  5000 --> forward
```

Atomicity matters. The increment and threshold decision should avoid race conditions.

## 4. Bandwidth Enforcement

Measure:

```text
bytes_in + bytes_out
```

or define the product explicitly as one direction only. For cost control, two-direction accounting is easier to reason about.

Before starting large streams, do not rely only on Content-Length. Streaming traffic must be accounted as bytes actually transferred.

## 5. Concurrent Connection Limit

Add a hidden operational safety limit in the data plane.

Example initial default:

```text
max 20 concurrent streams / tunnel
```

This is separate from the daily request quota.

## 6. Future Paid Plans

Limits should be configuration-driven from `plans`, not hard-coded throughout the codebase.
