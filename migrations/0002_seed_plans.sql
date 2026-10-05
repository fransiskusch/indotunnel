INSERT INTO plans (
    id, code, name, max_active_tunnels, daily_request_limit,
    monthly_bandwidth_limit_bytes, custom_subdomain_enabled, custom_domain_enabled
) VALUES (
    '00000000-0000-0000-0000-000000000001', 'free', 'Free', 1, 5000,
    10737418240, false, false
)
ON CONFLICT (code) DO NOTHING;
