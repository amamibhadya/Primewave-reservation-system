// Business rules for reservations. Kept in one place so they are easy to find and change.
export const RULES = {
  minDurationMinutes: 15,
  maxDurationHours: 24 * 7, // a reservation can span several days (e.g. a vehicle trip)
  maxAdvanceDays: 180, // cannot book further ahead than this
  pastGraceMinutes: 5, // tolerate small clock differences when booking "right now"
} as const;
