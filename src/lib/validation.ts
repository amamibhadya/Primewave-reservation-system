import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) =>
  text(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const resourceSchema = z.object({
  name: text(100).min(1, "Name is required"),
  type_id: z.coerce.number().int().positive("Choose a resource type"),
  location: optionalText(100),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1").max(10000),
  description: optionalText(500),
});

export const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Use a valid date and time");

export const reservationSchema = z.object({
  resource_id: z.coerce.number().int().positive("Choose a resource"),
  title: text(120).min(1, "Title is required"),
  reserved_by: text(100).min(1, "Please enter who the reservation is for"),
  contact_email: z
    .union([z.literal(""), z.string().trim().email("Enter a valid email")])
    .optional()
    .nullable()
    .transform((v) => (v ? v : null)),
  attendees: z.coerce.number().int().min(1, "At least 1 attendee").max(10000),
  start: localDateTime, // wall-clock time in the organisation timezone
  end: localDateTime,
});

export const cancelSchema = z.object({ reason: optionalText(300) });

export const typeSchema = z.object({ name: text(60).min(1, "Type name is required") });
