# Entity Relationship Diagram

```mermaid
erDiagram
    RESOURCE_TYPES ||--o{ RESOURCES : "categorises"
    RESOURCES ||--o{ RESERVATIONS : "is reserved through"

    RESOURCE_TYPES {
        serial id PK
        text name UK "e.g. Meeting Room, Vehicle"
        timestamptz created_at
    }

    RESOURCES {
        serial id PK
        int type_id FK "-> resource_types.id"
        text name "unique per type (case-insensitive)"
        text location
        int capacity "CHECK > 0"
        text description
        boolean is_active "soft delete, keeps history"
        timestamptz created_at
        timestamptz updated_at
    }

    RESERVATIONS {
        serial id PK
        int resource_id FK "-> resources.id"
        text title
        text reserved_by "person or team"
        text contact_email
        int attendees "CHECK > 0"
        timestamptz start_at
        timestamptz end_at "CHECK end_at > start_at"
        enum status "confirmed | cancelled"
        text cancel_reason
        timestamptz cancelled_at
        timestamptz created_at
    }
```

## The key constraint

`reservations` has a PostgreSQL **exclusion constraint**:

```sql
EXCLUDE USING gist (
  resource_id WITH =,
  tstzrange(start_at, end_at, '[)') WITH &&
) WHERE (status = 'confirmed')
```

Meaning: the same resource can never have two *confirmed* reservations whose time ranges overlap.
Ranges are half-open `[start, end)`, so 10:00–11:00 followed by 11:00–12:00 is allowed.
Cancelled reservations are ignored by the constraint, so a cancelled slot can be booked again.
