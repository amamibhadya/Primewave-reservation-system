-- Resource Reservation Management System — initial schema

-- Needed so a GiST index can combine "resource_id =" with a range overlap "&&".
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE reservation_status AS ENUM ('confirmed', 'cancelled');

CREATE TABLE resource_types (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,          -- e.g. "Meeting Room", "Vehicle"
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE resources (
  id           SERIAL PRIMARY KEY,
  type_id      INTEGER NOT NULL REFERENCES resource_types(id) ON DELETE RESTRICT,
  name         TEXT NOT NULL,
  location     TEXT,
  capacity     INTEGER NOT NULL DEFAULT 1 CHECK (capacity > 0),
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE, -- soft-delete: keeps booking history intact
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Names are unique case-insensitively within a type.
CREATE UNIQUE INDEX resources_type_name_uq ON resources (type_id, lower(name));

CREATE TABLE reservations (
  id              SERIAL PRIMARY KEY,
  resource_id     INTEGER NOT NULL REFERENCES resources(id) ON DELETE RESTRICT,
  title           TEXT NOT NULL,
  reserved_by     TEXT NOT NULL,              -- person or team
  contact_email   TEXT,
  attendees       INTEGER NOT NULL DEFAULT 1 CHECK (attendees > 0),
  start_at        TIMESTAMPTZ NOT NULL,
  end_at          TIMESTAMPTZ NOT NULL,
  status          reservation_status NOT NULL DEFAULT 'confirmed',
  cancel_reason   TEXT,
  cancelled_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT reservation_time_order CHECK (end_at > start_at),

  -- THE core business rule, enforced by the database itself:
  -- two *confirmed* reservations of the same resource may never overlap.
  -- Ranges are half-open [start, end) so back-to-back bookings (10:00-11:00 then
  -- 11:00-12:00) are allowed. Because this is a constraint (not application code),
  -- it is safe under concurrent requests — no race condition is possible.
  CONSTRAINT no_overlapping_reservations
    EXCLUDE USING gist (
      resource_id WITH =,
      tstzrange(start_at, end_at, '[)') WITH &&
    ) WHERE (status = 'confirmed')
);

CREATE INDEX reservations_resource_start_idx ON reservations (resource_id, start_at);
CREATE INDEX reservations_status_start_idx   ON reservations (status, start_at);
