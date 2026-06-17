-- User profile data (for filling ticket forms)
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id        UUID PRIMARY KEY REFERENCES users(id),
    title          VARCHAR(10) DEFAULT 'Tuan',  -- Tuan/Nyonya/Nona
    full_name      VARCHAR(255),
    phone          VARCHAR(20),
    contact_email  VARCHAR(255),
    id_number      VARCHAR(50),   -- KTP/Passport
    nationality    VARCHAR(100) DEFAULT 'Indonesia',
    updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Tiket.com credentials (encrypted)
CREATE TABLE IF NOT EXISTS platform_credentials (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID REFERENCES users(id) NOT NULL,
    platform       VARCHAR(50) NOT NULL DEFAULT 'tiket.com',
    email          VARCHAR(255) NOT NULL,
    password_enc   TEXT NOT NULL,  -- AES-256 encrypted
    is_verified    BOOLEAN DEFAULT false,
    last_used_at   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ DEFAULT NOW(),
    updated_at     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, platform)
);
