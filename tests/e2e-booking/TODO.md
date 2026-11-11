# Booking E2E — remaining test coverage

Close the approved E2E coverage gaps, one test at a time, checking both UI and database state.

## Progress log — 2026-11-02

- [x] Phase 0: repair booking locators, replace unavailable MinIO with S3Mock, and align notification expectations.
- [x] Fix the success page to display e-post or SMS; verify both channels in the existing notification tests.
- [x] Approve the coverage matrix and initial order: B3 → B5 → B6 → B7 → B2 → B9.
- [x] Add B3, B5, B6, B7, and B2; each passed individually and with the full suite.
- [x] Latest full run: **18 passed** (17 journey tests + 1 environment setup); no new test exposed a product bug.
- [x] Added B9, B1, B4, B8a and B8b (written 2026-11-03, **not yet run** — run `npm run test:e2e:booking`).
- [x] Written 2026-11-05, **not yet run**: `booking-cancellation`, `booking-availability`, `booking-rate-limit`,
      `booking-entry`, `booking-confirmation` specs (cancel/rebook, ownership, no slots, Sunday, rate limits,
      entitlement, bad params, double-submit, my-appointments, desktop, `.ics` vs stored time).
- [ ] Continue the matrix after remember tokens: booking recovery/navigation/authorization, SMS recovery/limits,
      in-flow sign-in, signup/reset/invites, session/role protection, company workflows, desktop/theme/DST checks.

The detailed covered and remaining scenarios are tracked below. Write one new test per turn, run it and the full
suite, report the result, then wait for "next". Product fixes require separate approval.

## Covered now

- Guest books 3 services → verified contact, appointment + service rows, session cleared, success page + `.ics`
- Wrong SMS code rejected without consuming the challenge or attaching a user
- Contact edit: name-only change keeps the user, mobile change re-verifies and swaps the user, cancel restores
- Already-verified user skips the SMS step entirely
- A mistyped code is corrected with Backspace and submitted
- Multi-provider company shows the employee step and books the provider that was picked
- Two customers contesting one slot → second is bounced to select-time, exactly one appointment exists
- Expired challenge refused even with the correct code, and never consumed
- Same service twice → one row with quantity 2
- Customer cancels their own appointment (`cancelled_at` set)
- Customer confirmation email delivery when email is present, SMS delivery when email is absent
- Five wrong SMS codes persist attempts and exhaust the challenge; the correct code is then refused
- B2: a real booking issues a remember cookie that, alone, attaches the same customer to a new booking
  without another SMS challenge
- B3: remember token with one day left skips SMS without access/refresh cookies, attaches the existing verified
  customer, and creates no OTP challenge
- B5: remember token expired five seconds ago shows SMS, creates one challenge for the verified customer,
  and leaves the booking session unattached
- B6: valid remember token for another mobile still requires SMS for the entered mobile and its existing owner
- B7: changing one remember-token signature character falls back to the SMS form without an error page
- B9, B1, B4, B8a, B8b: 60-day cookie issuance, no cookie, one minute left, wrong purpose, malformed token
  (written, not yet run)

---

## P0 — write these before launch

These are paths a real customer hits on day one, and none are exercised.

- [x] ~~**Two customers grab the same slot.**~~ Done — the loser is redirected to select-time and only one
      appointment is written. The test also proves both sessions really held the same slot first.
- [x] ~~**Company with more than one provider.**~~ Done — fixture now seeds company 2 (Anna + Bjørn).
- [x] **Customer confirmation notifications.** Existing tests assert only the skipped customer email delivery
      when email is present, and SMS delivery when email is absent, following backend commit `0c21a958`.
- [ ] **Remaining booking notifications.** Assert customer in-app, provider email, and scheduled reminder email.
- [x] **Cancellation — the rest of it.** (written, not yet run) `cancel-by-id` is covered for the happy path. Still open: that the slot
      actually frees up for rebooking, that cancelling someone else's appointment is refused, and the
      token-link `cancel` route (needs notification capture to get a real token).
- [x] **OTP attempt lockout.** Existing test asserts five persisted wrong attempts and refusal of the correct code.
- [x] **Remember-token boundaries.** B1, B4, B8a, B8b and B9 written; pending a first run.
- [x] **B2 — freshly issued remember token.** Complete a real booking, retain only the issued remember cookie,
      then reach overview in a new session with the same customer and no additional SMS challenge.
- [x] **B3 — remember token with one day left.** Browser reaches overview with the seeded customer attached;
      zero OTP challenges. Only the remember cookie is present before starting the flow.
- [x] **B5 — expired remember token.** Cookie remains present but its signed expiry is five seconds in the past;
      SMS shown, exactly one unconsumed challenge targets the existing customer, session user remains null.
- [x] **B6 — remember token for a different mobile.** Valid signed token cannot skip SMS for the entered number;
      exactly one unconsumed challenge targets that number's existing owner, session user remains null.
- [x] **B7 — tampered remember-token signature.** One changed signature character shows the SMS form;
      exactly one unconsumed challenge targets the existing customer, session user remains null.
- [x] **Success-page authorization.** The backend `get-appointment` now returns an appointment only to its owner
      (signed-in user or the booking session's user); covered in `booking-validation.database.spec.ts`.
- [x] **Password-reset replay.** Fixed in `ResetPasswordUseCase` (token is now consumed before the password is saved);
      covered in `ForgotPasswordUseCaseIntegrationTest` (replay, superseded link, mistyped confirmation).

## P1 — likely to surface within the first weeks

- [x] ~~**Expired OTP challenge.**~~ Done. The resend-after-expiry recovery path is still untested.
- [x] **Resend cooldown.** Written in `booking-resend.database.spec.ts` (not yet run): button locked with a countdown
      and no second row; after the cooldown the old challenge is retired and the new code completes the booking.
- [x] **Rate limiting.** (written, not yet run) `OtpRateLimiter` caps per mobile / per IP / per company per hour. Seed challenge rows
      directly to cross the threshold, then assert the request is rejected and no new challenge is written.
- [x] **Expired booking session.** Found a bug (customer stuck on the contact form). Fixed: expired sessions now
      restart automatically at the first step. Test in `booking-session-expiry.database.spec.ts` (not yet re-run).
- [x] **No available slots.** (written, not yet run) Seed an unavailability period or a fully-booked day and assert the select-time page
      degrades sensibly instead of showing an enabled "Fortsett" that fails later.
- [x] **Booking outside opening hours.** (written, not yet run) The fixture has no Sunday schedule — assert Sunday offers no slots.
- [x] ~~**Service quantity > 1.**~~ Done for quantity 2. `disableIncrement` and the effect on total duration
      are still untested.
- [x] **Contact form validation.** Empty names (native `required`), 7-digit mobile and `name@host` email written in
      `booking-validation.database.spec.ts`; each asserts no user row and no challenge (written, not yet run).
- [ ] **Signed-in user path.** `session/contact/sign-in` is untested end to end.
- [ ] **SMS recovery messages.** Test cooldown countdown, resend after expiry/exhaustion, and rate-limit wait messages.
- [ ] **Auth journeys.** Signup, email/mobile verification, verification-session expiry, password reset, invites,
      refresh rotation, sign-out, safe return URLs, and role/company isolation have no complete self-contained E2E flow.
- [ ] **Company journeys.** UI appointment submission, image upload, service/profile/schedule changes, employees,
      timesheets, offers, notifications, contacts, and settings need self-contained browser + database coverage.

## P2 — correctness polish

- [x] **Bad URL parameters.** (written, not yet run) Success page covered (non-numeric/missing appointmentId, missing companyId, unknown
      appointmentId). Still open: invalid `companyId` on the session route and invalid `theme`.
- [x] **Company not entitled to BOOKING.** (written, not yet run) Remove the `base.company_products` row and assert the public page refuses.
- [x] **Back-button / re-submit.** (written, not yet run) Navigating back after confirming, or double-clicking "Bekreft timebestilling",
      must not create two appointments. Worth folding into the P0 double-booking spec.
- [ ] **`CONTACT_REPLACEMENT_PENDING`** (`PublicSubmitAppointmentSession.kt:50`) — confirming while a mobile
      replacement is mid-flight must be refused.
- [x] **My appointments** (written, not yet run) (`booking.public.my-appointments`) — upcoming vs completed listing.
- [ ] **Timezone / DST.** Everything runs `Europe/Oslo`. Book across a DST boundary and assert the stored
      `start_time` and the `.ics` `DTSTART` agree.
- [x] **Desktop customer booking.** (written, not yet run) The public journey currently runs on Pixel 5 only.
- [ ] **Booking entry and context.** Cover place/company selection, theme changes, stale session-cookie recovery,
      company with no providers, and switching companies without leaking earlier selections.

---

## Harness work these depend on

- [x] ~~**Second booking profile in `seedBookingFixture`**~~ — company 2 seeds two providers, leaving company 1
      single-provider so the auto-skip branch stays covered.
- [ ] **A seed helper for "existing appointment"** so slot-conflict tests don't have to drive the UI twice.
- [ ] **Notification capture.** Decide between asserting DB/outbox rows or pointing SMTP/SMS at a stub in
      `scripts/e2e/start-backend.ts` for remaining notification paths. Customer delivery rows are already asserted.
- [x] **Restore runnable storage container.** Replaced unavailable `minio/minio:latest` with
      `adobe/s3mock:5.2.3`, using its HTTP readiness endpoint on port 9090.
- [ ] **Per-test isolation for parallel runs.** `resetMutableBookingState` truncates shared tables, so the suite is
      pinned to `workers: 1`. Fine for now; revisit if the suite gets slow.
- [ ] **CI — belongs in the backend repo, not this one.** Deliberately not set up yet.
      A workflow here would trigger on portal changes, but the failure that actually bites is a
      _backend_ change breaking booking, and `render.yaml` auto-deploys backend commits to `main`.
      Put it in `adamkb33/pitell` instead: it checks itself out with the built-in `GITHUB_TOKEN`
      and this repo is public, so no PAT is needed anywhere.
      When setting it up: build the backend first (`./gradlew :src:app:classes`) so `bootRun` starts
      inside its boot timeout, install Chromium only, and raise `E2E_BACKEND_TIMEOUT_MS` on a cold
      runner. Testcontainers uses the runner's Docker, which `ubuntu-latest` provides.
      Until then, run `npm run test:e2e:booking` before deploying — it takes about a minute.

## Known bugs this suite has already found

1. ~~OTP attempts never persist~~ — backend now records failed attempts in a separate transaction;
   the existing five-wrong-codes test passes and covers lockout.
2. **Repeatable demo seeds collide on user ID 1** against a fresh database, which is why the harness runs only
   versioned migrations.
3. ~~OTP input unusable after a rejected code~~ — fixed by rewriting `verification-code-input.tsx` as one
   native input.
4. Two flaky assertions of our own making, both now fixed: `locator.all()` does not auto-wait (service groups),
   and `boundingBox()` does not wait for layout (success heading). Worth remembering when adding tests.
5. ~~Success page claims SMS confirmation for email-only delivery~~ — now shows e-post when the customer has
   an email address, otherwise SMS, matching the backend. Both notification E2E tests assert the displayed channel.

---

Worth saying plainly: no suite makes launch failures impossible. Finishing P0 + P1 covers the paths that actually
carry money and customer trust; the rest reduces noise.
