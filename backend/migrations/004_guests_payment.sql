-- Saved guests (friends/family for multi-pax bookings)
CREATE TABLE IF NOT EXISTS saved_guests (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID REFERENCES users(id) NOT NULL,
    label          VARCHAR(50),  -- "Istri", "Teman 1", etc.
    title          VARCHAR(10) DEFAULT 'Tuan',
    full_name      VARCHAR(255) NOT NULL,
    phone          VARCHAR(20),
    email          VARCHAR(255),
    id_number      VARCHAR(50),
    nationality    VARCHAR(100) DEFAULT 'Indonesia',
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_guests_user ON saved_guests(user_id);

-- Payment method preferences
CREATE TABLE IF NOT EXISTS payment_methods (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID REFERENCES users(id) NOT NULL,
    method_type    VARCHAR(30) NOT NULL,  -- 'bca_va', 'credit_card', 'mandiri_va', etc.
    label          VARCHAR(100),          -- "BCA VA", "Visa ****1234"
    is_default     BOOLEAN DEFAULT false,
    -- CC details (encrypted, only for credit_card type)
    card_number_enc TEXT,
    card_expiry_enc TEXT,
    card_cvv_enc    TEXT,
    card_name       VARCHAR(100),
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, method_type, label)
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id);

-- Add payment_method and guest_ids to bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guest_ids TEXT[]; -- array of guest UUIDs
