# Demo video script (3–5 min) and interview talking points

## Video outline
1. **0:00 – Intro (20 s)** "ReserveHub solves the scenario: shared resources, informal bookings, overlaps and unclear availability."
2. **0:20 – Dashboard (30 s)** Stats, live "Available now / In use until…" per resource.
3. **0:50 – Resources (30 s)** List and filters; add a new resource (and a new type on the fly).
4. **1:20 – Reserve (60 s)** New reservation. Pick a time that clashes -> live warning appears and the button is disabled. Pick a free time -> reserve -> redirected to the resource's timeline showing the new block.
5. **2:20 – Find availability (30 s)** Choose a window -> only free resources listed -> Reserve from the result.
6. **2:50 – Cancel (20 s)** Cancel a reservation, show it under the Cancelled tab, then re-book the same slot.
7. **3:10 – Technical decisions (90 s)** Open `db/migrations/001_init.sql` and show the exclusion constraint. Explain: race conditions, why it is in the DB. Show the ER diagram. Mention timezones (timestamptz + org timezone), soft deletes, Zod validation, and the `npm run test:api` concurrency test (run it on screen if time allows).
8. **4:30 – Wrap-up (20 s)** Trade-offs: no auth / recurring bookings, and what you would add next.

## Questions you should be ready for
- *Why an exclusion constraint instead of checking in code?* Check-then-insert races; the DB gives an atomic guarantee.
- *Why `[)` ranges?* So back-to-back bookings are allowed.
- *Why `btree_gist`?* Lets a GiST index combine equality (`resource_id`) with range overlap.
- *Why timestamptz?* Unambiguous instants; the org timezone is applied only at the edges.
- *Why no ORM?* Range/exclusion constraints are Postgres features ORMs don't model; plain SQL is clearer here.
- *Why soft delete?* Keep history for audit; FK `RESTRICT` prevents orphaning.
- *What would you add with more time?* Auth/roles, recurring bookings, edit reservation, notifications, pagination, UI tests.
- *What happens if two people book at the same time?* One gets the booking, the other gets `409` with the clashing booking's details.
