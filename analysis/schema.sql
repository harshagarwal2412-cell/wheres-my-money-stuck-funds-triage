-- Where's My Money: normalized model of where a transfer's truth lives.
-- Each source system gets its own table, keyed by transfer_id, mirroring how
-- support would actually have to look things up today.

CREATE TABLE rails (
    rail_id     TEXT PRIMARY KEY,
    label       TEXT NOT NULL,
    direction   TEXT NOT NULL CHECK (direction IN ('in', 'out')),
    sla_hours   REAL NOT NULL CHECK (sla_hours > 0)
);

CREATE TABLE causes (
    cause_id    TEXT PRIMARY KEY,
    precedence  INTEGER NOT NULL UNIQUE,   -- rule order: lower wins
    label       TEXT NOT NULL,
    owner       TEXT NOT NULL,
    fix         TEXT NOT NULL,
    metric      TEXT NOT NULL
);

-- App-side record of the transfer
CREATE TABLE transfers (
    transfer_id       TEXT PRIMARY KEY,
    customer_id       TEXT NOT NULL,
    country           TEXT NOT NULL,
    rail_id           TEXT NOT NULL REFERENCES rails (rail_id),
    amount_usd        REAL NOT NULL CHECK (amount_usd > 0),
    age_hours         REAL NOT NULL CHECK (age_hours >= 0),
    maint_at_create   INTEGER NOT NULL,   -- rail was flagged for maintenance when created
    network           TEXT,               -- crypto only: network the funds arrived on
    expected_network  TEXT,               -- crypto only: network the deposit address is on
    customer_told     INTEGER NOT NULL    -- customer has been given a reason
);

-- Payment partner webhooks
CREATE TABLE partner_events (
    transfer_id       TEXT PRIMARY KEY REFERENCES transfers (transfer_id),
    partner_status    TEXT NOT NULL CHECK (partner_status IN ('pending', 'settled', 'returned', 'unknown')),
    settled_at_hours  REAL,
    ref_matched       INTEGER NOT NULL,   -- reference on the deposit matched a customer
    ref_issue         TEXT,
    return_code       TEXT
);

-- Internal ledger
CREATE TABLE ledger_entries (
    transfer_id    TEXT PRIMARY KEY REFERENCES transfers (transfer_id),
    ledger_status  TEXT NOT NULL CHECK (ledger_status IN ('none', 'credited'))
);

-- Compliance case tool (only transfers under review have a row)
CREATE TABLE compliance_reviews (
    transfer_id        TEXT PRIMARY KEY REFERENCES transfers (transfer_id),
    opened_at_hours    REAL NOT NULL,
    customer_notified  INTEGER NOT NULL,
    doc_needed         TEXT,
    doc_received       INTEGER NOT NULL
);

-- Output of the TypeScript rules engine (src/domain/classify.ts)
CREATE TABLE triage (
    transfer_id  TEXT PRIMARY KEY REFERENCES transfers (transfer_id),
    cause_id     TEXT NOT NULL REFERENCES causes (cause_id),
    past_sla     INTEGER NOT NULL
);

CREATE INDEX idx_transfers_rail ON transfers (rail_id);
CREATE INDEX idx_triage_cause ON triage (cause_id);
