# Markedsføring domain map

Markedsføring (`/company/marketing/*`, admins of companies with the MARKETING product) on the app-wide rules in `../SKILL.md`, following the booking blueprint (`booking-domain.md`). This file holds only what is specific to marketing.

The user approved the domain's Oversikt and its two lists on 2026-11-18 from a sketch of the domain (desktop overview + phone frames Oversikt → Kampanjer → Mottakere). The unsubscribe page for customers (`/u/:token`) is public and not part of the company domain.

## What the domain is about

Every customer says yes or no to **e-post and SMS separately** while booking (`marketing.marketing_consents`, one row per company, channel and address, `OPTED_IN` / `OPTED_OUT`). A campaign goes to one channel. So numbers about people are per channel, and "Mottakere" without a channel counts each customer once (dev data on 2026-11-18: 40 customers, 29 e-post, 18 SMS, 7 both).

## Areas

| Area      | Pages                             | Page type | Color (key card) | Create button |
| --------- | --------------------------------- | --------- | ---------------- | ------------- |
| Kampanjer | Kampanjer → Kampanje, Ny kampanje | Liste     | pink             | Ny kampanje   |
| Mottakere | Mottakere (Alle \| E-post \| SMS) | Liste     | fuchsia          | —             |

The domain colour is pink (sidebar tile, bottom menu wash, page background). Channels keep their own colours wherever they show: `marketing-email` (blue) and `marketing-sms` (plum).

## The domain's Oversikt (the Markedsføring page)

- Key destinations side by side: Kampanjer (pink, "n denne måneden": campaigns started this month in Oslo) and Mottakere (fuchsia, "n kunder": customers with at least one yes). Both numbers come from the lists they open.
- One card of rows: E-post and SMS, each "n mottakere", opening Mottakere filtered to that channel (`?kanal=e-post` / `?kanal=sms`).
- No create button (Ny kampanje lives on Kampanjer).
- Later areas (a Statistikk Tall page: sent, failed, opted out per month) get a row here when they exist.

## Backend

- `GET /marketing-service/company-user/marketing/recipients?channel=EMAIL|SMS&page&size` (`CompanyUserMarketingRecipientController`): one `MarketingRecipientDto` per customer (`userId`, `givenName`, `familyName`, `channels: [{ channel, address, since }]`), newest yes first, paged; `meta.pagination.totalElements` is the number of customers (for the channel, when given).
- Campaign list, detail, create, preview, cancel and messages: `CompanyUserMarketingCampaignController`.

## Page by page: target and status

| Page                                       | Target                                                                                                                                                                                                                                                                                                              | Status                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Markedsføring (`/company/marketing`)       | Oversikt as above                                                                                                                                                                                                                                                                                                   | done (2026-11-18), e2e: `tests/e2e/marketing.spec.ts` |
| Kampanjer (`/company/marketing/kampanjer`) | Liste on the list standard (rule 7): month strips, `CampaignListRow` on `ListRow` (sending = highlighted with "Sender", cancelled = muted with "Avbrutt"), 25 per page, create action "Ny kampanje"                                                                                                                 | done (2026-11-18), e2e: `tests/e2e/marketing.spec.ts` |
| Mottakere (`/company/marketing/mottakere`) | Liste on the list standard: Alle \| E-post \| SMS above the list (`SegmentedLinks`, counts in the labels, `?kanal=`), grouped by the month they said yes (to the channel shown), rows with initials in the customer's colour, name, channels in channel colours; no date on the row; rows open nothing; 25 per page | done (2026-11-18), e2e: `tests/e2e/marketing.spec.ts` |
| Ny kampanje (`/company/marketing/create`)  | Skjema on `CompanyFormPageTemplate` with the send bar on phones; no in-page back link (up goes to Kampanjer); "Send" disabled with one missing line instead of errors after pressing; no helper text                                                                                                                | not built (in-page "‹ Kampanjer" link still there)    |
| Kampanje (`/company/marketing/:id`)        | Detail pattern; recipients not in a fold-out; the campaign's name in the breadcrumb (`handle.title`); no in-page back link (up goes to Kampanjer)                                                                                                                                                                   | not built (in-page "‹ Kampanjer" link still there)    |

Update the status column whenever a page is built, and name its e2e spec (ui-rules rule 8).
