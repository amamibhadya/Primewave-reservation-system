// Seeds demo data. Safe to run repeatedly (skips if resources already exist).
import pg from "pg";

const tz = process.env.ORG_TIMEZONE || "Asia/Colombo";
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const { rows } = await client.query("SELECT count(*)::int AS n FROM resources");
  if (rows[0].n > 0) {
    console.log("Resources already exist — skipping seed.");
  } else {
    const types = {};
    for (const name of ["Meeting Room", "Vehicle", "Equipment", "Workspace"]) {
      const r = await client.query("INSERT INTO resource_types (name) VALUES ($1) RETURNING id", [name]);
      types[name] = r.rows[0].id;
    }
    const resources = [
      ["Meeting Room", "Boardroom", "Floor 3", 12, "Large room with projector and video conferencing"],
      ["Meeting Room", "Huddle Room A", "Floor 2", 4, "Small room for quick syncs"],
      ["Meeting Room", "Training Room", "Floor 1", 25, "Classroom layout, whiteboards"],
      ["Vehicle", "Company Van", "Basement parking", 8, "9-seater van for team trips"],
      ["Equipment", "Projector Kit", "IT store", 1, "Portable projector, screen and HDMI adapters"],
      ["Workspace", "Hot Desk Zone", "Floor 2", 10, "Shared desks, first come first served"],
    ];
    const ids = {};
    for (const [t, name, loc, cap, desc] of resources) {
      const r = await client.query(
        "INSERT INTO resources (type_id,name,location,capacity,description) VALUES ($1,$2,$3,$4,$5) RETURNING id",
        [types[t], name, loc, cap, desc],
      );
      ids[name] = r.rows[0].id;
    }
    // A few reservations relative to "today" in the org timezone.
    const at = (dayOffset, hhmm) =>
      client.query(
        `SELECT ((date_trunc('day', now() AT TIME ZONE $1) + ($2 || ' days')::interval + $3::time) AT TIME ZONE $1) AS ts`,
        [tz, String(dayOffset), hhmm],
      ).then((r) => r.rows[0].ts);
    const bookings = [
      ["Boardroom", "Weekly Leadership Sync", "Nimal Perera", 8, 0, "14:00", "15:30"],
      ["Boardroom", "Client Demo", "Sales Team", 10, 1, "10:00", "11:30"],
      ["Huddle Room A", "Design Review", "UX Team", 4, 0, "11:00", "12:00"],
      ["Training Room", "New Joiner Onboarding", "HR Team", 20, 1, "09:00", "13:00"],
      ["Company Van", "Site Visit - Galle", "Operations", 5, 2, "07:00", "18:00"],
      ["Projector Kit", "Offsite Workshop", "Kasun Silva", 1, 1, "08:00", "17:00"],
    ];
    for (const [res, title, by, att, d, s, e] of bookings) {
      await client.query(
        `INSERT INTO reservations (resource_id,title,reserved_by,attendees,start_at,end_at) VALUES ($1,$2,$3,$4,$5,$6)`,
        [ids[res], title, by, att, await at(d, s), await at(d, e)],
      );
    }
    console.log("Seeded demo data.");
  }
} finally {
  await client.end();
}
