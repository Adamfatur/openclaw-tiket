-- Roles
CREATE TABLE IF NOT EXISTS roles (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(50) UNIQUE NOT NULL,
    permissions JSONB NOT NULL DEFAULT '[]'
);

-- Users
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) UNIQUE NOT NULL,
    name          VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id       INT REFERENCES roles(id),
    is_active     BOOLEAN DEFAULT true,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE IF NOT EXISTS bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id) NOT NULL,
    status          VARCHAR(30) NOT NULL DEFAULT 'queued',
    platform        VARCHAR(50) NOT NULL DEFAULT 'tiket.com',
    origin          VARCHAR(100) NOT NULL,
    destination     VARCHAR(100) NOT NULL,
    departure_date  DATE NOT NULL,
    return_date     DATE,
    passengers      JSONB NOT NULL,
    preferences     JSONB,
    result          JSONB,
    claw_session_id UUID,
    queue_position  INT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Booking Steps
CREATE TABLE IF NOT EXISTS booking_steps (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID REFERENCES bookings(id) NOT NULL,
    step_number INT NOT NULL,
    action      VARCHAR(100) NOT NULL,
    message     TEXT,
    screenshot  TEXT,
    status      VARCHAR(20) DEFAULT 'completed',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Claw Sessions
CREATE TABLE IF NOT EXISTS claw_sessions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slot_number   INT NOT NULL,
    user_id       UUID REFERENCES users(id),
    booking_id    UUID REFERENCES bookings(id),
    container_id  VARCHAR(100),
    status        VARCHAR(20) DEFAULT 'idle',
    started_at    TIMESTAMPTZ,
    ended_at      TIMESTAMPTZ
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID REFERENCES users(id),
    action     VARCHAR(100) NOT NULL,
    resource   VARCHAR(100),
    details    JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_steps_booking_id ON booking_steps(booking_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Seed roles
INSERT INTO roles (name, permissions) VALUES 
    ('admin', '["booking:create","booking:view_own","booking:view_all","user:manage","claw:configure","system:audit"]'),
    ('member', '["booking:create","booking:view_own","booking:cancel_own"]')
ON CONFLICT (name) DO NOTHING;
