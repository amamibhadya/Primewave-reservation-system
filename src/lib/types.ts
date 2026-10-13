export type ResourceType = { id: number; name: string };

export type Resource = {
  id: number;
  type_id: number;
  type_name: string;
  name: string;
  location: string | null;
  capacity: number;
  description: string | null;
  is_active: boolean;
};

export type ResourceWithStatus = Resource & {
  in_use_until: Date | null; // set when a confirmed reservation is happening right now
  in_use_by: string | null;
  next_start: Date | null; // start of the next confirmed reservation
};

export type Reservation = {
  id: number;
  resource_id: number;
  resource_name: string;
  resource_type: string;
  title: string;
  reserved_by: string;
  contact_email: string | null;
  attendees: number;
  start_at: Date;
  end_at: Date;
  status: "confirmed" | "cancelled";
  cancel_reason: string | null;
  cancelled_at: Date | null;
  created_at: Date;
};

export type DisplayStatus = "upcoming" | "in-progress" | "completed" | "cancelled";

export function displayStatus(r: Pick<Reservation, "status" | "start_at" | "end_at">, now = new Date()): DisplayStatus {
  if (r.status === "cancelled") return "cancelled";
  if (new Date(r.end_at) <= now) return "completed";
  if (new Date(r.start_at) <= now) return "in-progress";
  return "upcoming";
}
