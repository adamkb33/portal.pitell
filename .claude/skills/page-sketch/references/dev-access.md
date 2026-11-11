# Seeing pages locally

- Frontend dev server: `http://localhost:5173` (usually already running; attach with `preview_start {url}`).
- Backend (Spring, monolith): `http://localhost:8010` (`VITE_API_GATEWAY_URL` in `.env`). If pages show "Det er problemer akkurat nå", the backend is down; tell the user rather than starting it.
- Company sign-in (dev database seed, `pitell/src/app/src/main/resources/db/seed-monolith/base/R__01_users.sql`):
  - user: `fredrikstadbarbershop@gmail.com`
  - password: `password` (dev seed default, local only)
- The e2e user in `.env.e2e` only exists in the e2e testcontainer database, not in the dev database.
- Public booking needs no sign-in: `/booking/public/appointment` → pick the salon. When signed in as the company user the contact step is skipped. Stop at the overview; confirming creates a real appointment in the dev database.
- Useful company URLs: `/company/booking/appointments` (reference list), `/company/booking/appointments/:id` (reference detail), `/company/booking/schedule`, `/company/booking/admin/services`, `/company`.
