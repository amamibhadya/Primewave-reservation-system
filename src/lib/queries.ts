import { pool } from "./db";
import { AppError } from "./errors";
import { RULES } from "./rules";
import { dateKey, dayBounds, formatRange, localToDate } from "./time";
import type { Reservation, Resource, ResourceType, ResourceWithStatus } from "./types";
import { z } from "zod";
import { reservationSchema, resourceSchema } from "./validation";

// ---------- Resource types ----------

export async function listTypes(): Promise<ResourceType[]> {
  const { rows } = await pool.query("SELECT id, name FROM resource_types ORDER BY name");
  return rows;
}

export async function createType(name: string): Promise<ResourceType> {
  try {
    const { rows } = await pool.query("INSERT INTO resource_types (name) VALUES ($1) RETURNING id, name", [name]);
    return rows[0];
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new AppError(409, `The type "${name}" already exists`);
    throw e;
  }
}

// ---------- Resources ----------

const RESOURCE_COLUMNS = `r.id, r.type_id, t.name AS type_name, r.name, r.location, r.capacity, r.description, r.is_active`;

export async function listResources(opts: { includeInactive?: boolean; typeId?: number; q?: string } = {}) {
  const where: string[] = [];
  const params: unknown[] = [];
  if (!opts.includeInactive) where.push("r.is_active");
  if (opts.typeId) {
    params.push(opts.typeId);
    where.push(`r.type_id = $${params.length}`);
  }
  if (opts.q) {
    params.push(`%${opts.q}%`);
    where.push(`(r.name ILIKE $${params.length} OR r.location ILIKE $${params.length})`);
  }
  const { rows } = await pool.query<ResourceWithStatus>(
    `SELECT ${RESOURCE_COLUMNS},
            cur.end_at AS in_use_until, cur.reserved_by AS in_use_by, nxt.start_at AS next_start
       FROM resources r
       JOIN resource_types t ON t.id = r.type_id
       LEFT JOIN LATERAL (
         SELECT end_at, reserved_by FROM reservations
          WHERE resource_id = r.id AND status = 'confirmed' AND start_at <= now() AND end_at > now()
          LIMIT 1) cur ON true
       LEFT JOIN LATERAL (
         SELECT start_at FROM reservations
          WHERE resource_id = r.id AND status = 'confirmed' AND start_at > now()
          ORDER BY start_at LIMIT 1) nxt ON true
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY r.is_active DESC, t.name, r.name`,
    params,
  );
  return rows;
}

export async function getResource(id: number): Promise<Resource | null> {
  if (!Number.isInteger(id)) return null;
  const { rows } = await pool.query<Resource>(
    `SELECT ${RESOURCE_COLUMNS} FROM resources r JOIN resource_types t ON t.id = r.type_id WHERE r.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function createResource(input: z.infer<typeof resourceSchema>) {
  try {
    const { rows } = await pool.query(
      `INSERT INTO resources (type_id, name, location, capacity, description)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [input.type_id, input.name, input.location, input.capacity, input.description],
    );
    return getResource(rows[0].id);
  } catch (e) {
    const code = (e as { code?: string }).code;
    if (code === "23505") throw new AppError(409, `A resource named "${input.name}" already exists in this type`);
    if (code === "23503") throw new AppError(400, "Selected resource type does not exist");
    throw e;
  }
}

export async function updateResource(
  id: number,
  input: Partial<z.infer<typeof resourceSchema>> & { is_active?: boolean },
) {
  const current = await getResource(id);
  if (!current) throw new AppError(404, "Resource not found");

  // Don't silently strand people who already hold reservations.
  if (input.is_active === false && current.is_active) {
    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM reservations WHERE resource_id = $1 AND status = 'confirmed' AND end_at > now()",
      [id],
    );
    if (rows[0].n > 0) {
      throw new AppError(
        409,
        `Cannot deactivate: ${rows[0].n} upcoming reservation(s) exist. Cancel them first.`,
      );
    }
  }

  const merged = { ...current, ...input };
  try {
    await pool.query(
      `UPDATE resources SET type_id=$2, name=$3, location=$4, capacity=$5, description=$6, is_active=$7, updated_at=now()
        WHERE id=$1`,
      [id, merged.type_id, merged.name, merged.location, merged.capacity, merged.description, merged.is_active],
    );
  } catch (e) {
    if ((e as { code?: string }).code === "23505") throw new AppError(409, `A resource named "${merged.name}" already exists in this type`);
    throw e;
  }
  return getResource(id);
}

// ---------- Reservations ----------

const RESERVATION_SELECT = `
  SELECT v.id, v.resource_id, r.name AS resource_name, t.name AS resource_type, v.title, v.reserved_by,
         v.contact_email, v.attendees, v.start_at, v.end_at, v.status, v.cancel_reason, v.cancelled_at, v.created_at
    FROM reservations v
    JOIN resources r ON r.id = v.resource_id
    JOIN resource_types t ON t.id = r.type_id`;

export async function listReservations(
  opts: {
    resourceId?: number;
    status?: "confirmed" | "cancelled";
    scope?: "upcoming" | "past" | "all";
    from?: Date;
    to?: Date;
    limit?: number;
  } = {},
) {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    params.push(v);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (opts.resourceId) add("v.resource_id = ?", opts.resourceId);
  if (opts.status) add("v.status = ?", opts.status);
  if (opts.from) add("v.end_at > ?", opts.from); // overlaps [from, to)
  if (opts.to) add("v.start_at < ?", opts.to);
  if (opts.scope === "upcoming") where.push("v.end_at > now()");
  if (opts.scope === "past") where.push("v.end_at <= now()");
  const order = opts.scope === "past" ? "v.start_at DESC" : "v.start_at ASC";
  params.push(opts.limit ?? 200);
  const { rows } = await pool.query<Reservation>(
    `${RESERVATION_SELECT} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY ${order} LIMIT $${params.length}`,
    params,
  );
  return rows;
}

export async function findConflicts(resourceId: number, start: Date, end: Date) {
  const { rows } = await pool.query<Reservation>(
    `${RESERVATION_SELECT}
      WHERE v.resource_id = $1 AND v.status = 'confirmed' AND v.start_at < $3 AND v.end_at > $2
      ORDER BY v.start_at`,
    [resourceId, start, end],
  );
  return rows;
}

export async function createReservation(input: z.infer<typeof reservationSchema>) {
  const start = localToDate(input.start);
  const end = localToDate(input.end);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) throw new AppError(400, "Invalid date or time");

  // --- business rules ---
  const now = Date.now();
  if (end <= start) throw new AppError(400, "End time must be after the start time");
  if (start.getTime() < now - RULES.pastGraceMinutes * 60_000) throw new AppError(400, "Reservations cannot start in the past");
  if (start.getTime() > now + RULES.maxAdvanceDays * 86_400_000)
    throw new AppError(400, `Reservations can only be made up to ${RULES.maxAdvanceDays} days in advance`);
  const minutes = (end.getTime() - start.getTime()) / 60_000;
  if (minutes < RULES.minDurationMinutes) throw new AppError(400, `Minimum duration is ${RULES.minDurationMinutes} minutes`);
  if (minutes > RULES.maxDurationHours * 60) throw new AppError(400, `Maximum duration is ${RULES.maxDurationHours} hours`);

  const resource = await getResource(input.resource_id);
  if (!resource) throw new AppError(404, "Resource not found");
  if (!resource.is_active) throw new AppError(409, `${resource.name} is not available for booking`);
  if (input.attendees > resource.capacity)
    throw new AppError(400, `${resource.name} holds at most ${resource.capacity} (you entered ${input.attendees})`);

  try {
    const { rows } = await pool.query(
      `INSERT INTO reservations (resource_id, title, reserved_by, contact_email, attendees, start_at, end_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [input.resource_id, input.title, input.reserved_by, input.contact_email, input.attendees, start, end],
    );
    return getReservation(rows[0].id);
  } catch (e) {
    // 23P01 = exclusion_violation: the database refused an overlapping booking.
    // This is what makes double-booking impossible even when two requests race.
    if ((e as { code?: string }).code === "23P01") {
      const conflicts = await findConflicts(input.resource_id, start, end);
      const first = conflicts[0];
      throw new AppError(
        409,
        first
          ? `${resource.name} is already booked ${formatRange(first.start_at, first.end_at)} ("${first.title}", ${first.reserved_by})`
          : `${resource.name} is already booked for that time`,
        conflicts,
      );
    }
    throw e;
  }
}

export async function getReservation(id: number): Promise<Reservation | null> {
  if (!Number.isInteger(id)) return null;
  const { rows } = await pool.query<Reservation>(`${RESERVATION_SELECT} WHERE v.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function cancelReservation(id: number, reason: string | null) {
  const { rows } = await pool.query(
    `UPDATE reservations SET status='cancelled', cancel_reason=$2, cancelled_at=now()
      WHERE id=$1 AND status='confirmed' AND end_at > now() RETURNING id`,
    [id, reason],
  );
  if (rows.length === 0) {
    const existing = await getReservation(id);
    if (!existing) throw new AppError(404, "Reservation not found");
    if (existing.status === "cancelled") throw new AppError(409, "Reservation is already cancelled");
    throw new AppError(409, "A reservation that has already ended cannot be cancelled");
  }
  return getReservation(id);
}

// ---------- Availability ----------

export async function findAvailableResources(start: Date, end: Date, opts: { typeId?: number; minCapacity?: number } = {}) {
  const params: unknown[] = [start, end];
  const extra: string[] = [];
  if (opts.typeId) {
    params.push(opts.typeId);
    extra.push(`AND r.type_id = $${params.length}`);
  }
  if (opts.minCapacity) {
    params.push(opts.minCapacity);
    extra.push(`AND r.capacity >= $${params.length}`);
  }
  const { rows } = await pool.query<Resource>(
    `SELECT ${RESOURCE_COLUMNS}
       FROM resources r JOIN resource_types t ON t.id = r.type_id
      WHERE r.is_active ${extra.join(" ")}
        AND NOT EXISTS (
          SELECT 1 FROM reservations v
           WHERE v.resource_id = r.id AND v.status = 'confirmed' AND v.start_at < $2 AND v.end_at > $1)
      ORDER BY t.name, r.name`,
    params,
  );
  return rows;
}

// ---------- Dashboard ----------

export async function dashboardStats() {
  const { rows } = await pool.query(
    `SELECT
       (SELECT count(*)::int FROM resources WHERE is_active) AS active_resources,
       (SELECT count(DISTINCT resource_id)::int FROM reservations
         WHERE status='confirmed' AND start_at <= now() AND end_at > now()) AS in_use_now,
       (SELECT count(*)::int FROM reservations WHERE status='confirmed' AND end_at > now()) AS upcoming,
       (SELECT count(*)::int FROM reservations WHERE status='confirmed'
          AND start_at < $2 AND end_at > $1) AS today`,
    [...todayRange()],
  );
  return rows[0] as { active_resources: number; in_use_now: number; upcoming: number; today: number };
}

function todayRange(): [Date, Date] {
  const b = dayBounds(dateKey(new Date()));
  return [b.start, b.end];
}
