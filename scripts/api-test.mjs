
const BASE = process.env.BASE_URL || "http://localhost:3000";
let passed = 0, failed = 0;

const call = async (method, path, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
};
const check = (name, cond, extra = "") => {
  if (cond) { passed++; console.log("  ✓", name); }
  else { failed++; console.log("  ✗", name, extra); }
};

const pad = (n) => String(n).padStart(2, "0");
const slot = (daysAhead, h1, h2) => {
  const d = new Date(Date.now() + daysAhead * 86400000);
  const day = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  return { start: `${day}T${pad(h1)}:00`, end: `${day}T${pad(h2)}:00` };
};
const booking = (resource_id, s, extra = {}) => ({
  resource_id, title: "Test", reserved_by: "Tester", attendees: 2, ...s, ...extra,
});

const types = (await call("GET", "/api/types")).json.data;
const typeId = types[0].id;
const name = "Test Room " + Date.now();

console.log("Resources");
let r = await call("POST", "/api/resources", { name, type_id: typeId, capacity: 6, location: "Test" });
check("create resource -> 201", r.status === 201, JSON.stringify(r.json));
const rid = r.json.data.id;
r = await call("POST", "/api/resources", { name: name.toUpperCase(), type_id: typeId, capacity: 6 });
check("duplicate name (case-insensitive) -> 409", r.status === 409);
r = await call("POST", "/api/resources", { name: "", type_id: typeId, capacity: 6 });
check("empty name -> 400", r.status === 400);
r = await call("POST", "/api/resources", { name: "X", type_id: typeId, capacity: 0 });
check("capacity 0 -> 400", r.status === 400);

console.log("Reservations: conflicts");
const a = slot(20, 10, 12);
r = await call("POST", "/api/reservations", booking(rid, a));
check("book 10-12 -> 201", r.status === 201, JSON.stringify(r.json));
const firstId = r.json.data?.id;
r = await call("POST", "/api/reservations", booking(rid, a));
check("exact same slot -> 409", r.status === 409);
check("409 carries the conflicting reservation", r.json.details?.length === 1);
r = await call("POST", "/api/reservations", booking(rid, slot(20, 11, 13)));
check("overlap at the end -> 409", r.status === 409);
r = await call("POST", "/api/reservations", booking(rid, slot(20, 9, 11)));
check("overlap at the start -> 409", r.status === 409);
r = await call("POST", "/api/reservations", booking(rid, slot(20, 10, 11)));
check("contained inside -> 409", r.status === 409);
r = await call("POST", "/api/reservations", booking(rid, slot(20, 8, 15)));
check("wraps around existing -> 409", r.status === 409);
r = await call("POST", "/api/reservations", booking(rid, slot(20, 12, 13)));
check("back-to-back (12-13) allowed -> 201", r.status === 201, JSON.stringify(r.json));
r = await call("POST", "/api/reservations", booking(rid, slot(20, 9, 10)));
check("back-to-back before (9-10) allowed -> 201", r.status === 201);

console.log("Reservations: validation");
r = await call("POST", "/api/reservations", booking(rid, slot(21, 12, 10)));
check("end before start -> 400", r.status === 400);
r = await call("POST", "/api/reservations", booking(rid, slot(-3, 10, 11)));
check("in the past -> 400", r.status === 400);
r = await call("POST", "/api/reservations", booking(rid, slot(22, 10, 11), { attendees: 50 }));
check("over capacity -> 400", r.status === 400);
r = await call("POST", "/api/reservations", booking(rid, slot(400, 10, 11)));
check("too far ahead -> 400", r.status === 400);
r = await call("POST", "/api/reservations", booking(999999, slot(22, 10, 11)));
check("unknown resource -> 404", r.status === 404);
r = await call("POST", "/api/reservations", booking(rid, slot(22, 10, 11), { contact_email: "nope" }));
check("bad email -> 400", r.status === 400);

console.log("Concurrency: 12 simultaneous requests for the same slot");
const hot = slot(25, 14, 16);
const results = await Promise.all(
  Array.from({ length: 12 }, (_, i) => call("POST", "/api/reservations", booking(rid, hot, { title: "Race " + i }))),
);
const ok = results.filter((x) => x.status === 201).length;
const conflict = results.filter((x) => x.status === 409).length;
check("exactly one succeeds", ok === 1, `ok=${ok}`);
check("all others get 409", conflict === 11, `conflict=${conflict}`);

console.log("Availability");
r = await call("GET", `/api/availability?resourceId=${rid}&start=${a.start}&end=${a.end}`);
check("booked slot reported unavailable", r.json.data.available === false && r.json.data.conflicts.length === 1);
r = await call("GET", `/api/availability?resourceId=${rid}&start=${slot(30, 10, 11).start}&end=${slot(30, 10, 11).end}`);
check("free slot reported available", r.json.data.available === true);
r = await call("GET", `/api/availability?start=${a.start}&end=${a.end}`);
check("search excludes the booked resource", !r.json.data.resources.some((x) => x.id === rid));
r = await call("GET", `/api/availability?start=${slot(30, 10, 11).start}&end=${slot(30, 10, 11).end}`);
check("search includes it when free", r.json.data.resources.some((x) => x.id === rid));

console.log("Cancellation");
r = await call("POST", `/api/reservations/${firstId}/cancel`, { reason: "Plans changed" });
check("cancel -> 200 and status cancelled", r.status === 200 && r.json.data.status === "cancelled");
r = await call("POST", `/api/reservations/${firstId}/cancel`, {});
check("cancel twice -> 409", r.status === 409);
r = await call("POST", "/api/reservations", booking(rid, a));
check("cancelled slot can be re-booked -> 201", r.status === 201, JSON.stringify(r.json));
r = await call("POST", `/api/reservations/999999/cancel`, {});
check("cancel unknown -> 404", r.status === 404);

console.log("Deactivation");
r = await call("PATCH", `/api/resources/${rid}`, { is_active: false });
check("deactivate with upcoming bookings -> 409", r.status === 409);
const all = (await call("GET", `/api/reservations?resourceId=${rid}&status=confirmed&scope=upcoming`)).json.data;
for (const x of all) await call("POST", `/api/reservations/${x.id}/cancel`, {});
r = await call("PATCH", `/api/resources/${rid}`, { is_active: false });
check("deactivate after cancelling all -> 200", r.status === 200 && r.json.data.is_active === false);
r = await call("POST", "/api/reservations", booking(rid, slot(40, 10, 11)));
check("booking an inactive resource -> 409", r.status === 409);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
