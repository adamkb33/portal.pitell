---
name: page-sketch
description: Sketch-first redesign workflow and design language for portal.pitell. Use this whenever the user asks for a sketch, mockup, redesign or new layout of a page or component in this app, or says a page looks ugly, cluttered, boring, old or "not like the others" and wants it nicer — even if they never say "sketch". Also use it when building a page from a sketch the user approved ("Build it"), and when they give feedback on how things should look so the preference gets recorded.
---

# Page sketch

Turn "make this page better" into one concrete, real-looking sketch the user can react to, then build exactly what they approved.

The user is the art director. They decide by looking, not by reading options, so the job is to show one strong proposal fast, listen to the reaction, and keep a record of their taste so the next sketch starts closer.

## Before anything: read the taste file

Read `references/preferences.md` first. It holds what the user has already decided (dated). It overrides everything else in this skill, including the patterns. If a sketch would break a preference, follow the preference.

Then load the `ui-rules` skill. It says how the app behaves (a list page's create button floats above the bottom menu and creates what the page lists, pages below a list have none, form pages hide the menu and show a Lagre bar, delete lives on the edit page, every result message is a flash toast). Sketches must show that behavior: draw the create button (`fab`) the page would really have (or none), and show results as the toast.

## The loop

### 1. See the page as it is

- Open the page in the Browser pane. The dev server usually already runs on `http://localhost:5173`; attach with `preview_start {url}`. Only start it by name (`dev`) if nothing listens on 5173, because `npm run dev` kills whatever is on that port.
- Company pages need a sign-in: use the seeded dev user in `references/dev-access.md`.
- Look at it at 375px (mobile preset) and 1280px. Note what is cluttered, duplicated, unclear or dull.
- Read the route file and its `_components/` so you know the real data, every action the page offers, and what the loader/action already supports.

### 2. Decide what the page is for

Write down for yourself, in one line each:

- the job of the page (what someone comes here to do),
- the one primary action (one blue button per screen),
- everything else the page must still allow (secondary actions move to the item's own page, a menu, or a quieter style).

### 3. Pick the pattern

Match the page to a pattern in `references/patterns.md` (list, detail, edit page, booking step, overview, filters, empty state). Copy its anatomy. The appointment list and the public booking flow are the reference designs; new pages should feel like siblings of them. Use `references/design-language.md` for colors, type, spacing, color-by-category and copy.

### 4. Draw one sketch

- Load the visualize guidance once per session (`read_me` with the `mockup` module), then build the sketch from `assets/sketch-kit.html`: it already has the app's tokens, the desktop and phone shells and the common pieces (rows, group headers, chips, buttons, tiles). Using it:
  - **No design variants.** The kit is the single source of truth for how existing pieces look: rows, strips, group headers, tiles, buttons, the top bar, sidebar, bottom menu, page background, stat rows, month stepper, summary rows (`kv`), form bar (`cbar`). Use its classes as they are; don't restyle them inline or invent look-alikes. Inline styles are only for layout (widths, gaps, which column). If the sketch needs a piece the kit doesn't have yet, first copy it into the kit from the built component (with the source file in a comment), then use it. A new kind of piece the page needs is the only place a sketch may differ from the kit, and you name it in the change list.
  - Whenever a build changes how a shared piece looks, update the kit in the same change, so the next sketch starts from what is built.
  - Replace the `{{…}}` placeholders; fill `{{DESKTOP_PAGE}}` and `{{PHONE_PAGE}}` with the kit's classes (`card`, `tb`, `strip`, `gh`, `row`, `av`, `tile`, `chip`, `btn pri|ton|txt|del|ind|grn`, `mon`, `stat`, `kv`, `cbar`, `bar`…). Category colors are classes: `teal`, `purple`, `pink`, `orange`, `sky`, `plum` on a `gh`, `av` or `tile`; the page background's section colour is `area-teal|area-orange|area-purple|area-pink` on the frame (`dk` / `ph`). Mark the active bottom-menu tab with `on`.
  - Mark the active sidebar item with `on` and its section color.
  - Phone header: the menu button ≡ (`<i class="ti ti-menu-2 hb" aria-label="Åpne meny"></i>`) only on a domain's top pages (Oversikt, Booking, Tilbud…). On every page below them swap it for the up arrow, `<i class="ti ti-chevron-left up" aria-label="Tilbake til …"></i>`, and draw no back link inside the page (`ui-rules` → Page top).
  - Public booking pages have no sidebar or bottom menu: drop `side`, `ptop` and `pnav`, add a plain white header with "Pitell", and use the indigo buttons (`ind`, `grn` for the final confirm) and the floating `bar`.
  - For a flow, wrap several `ph` frames in a `phs` row (up to 3).
  - The widget can't use `position: fixed` or HTML comments; floating bars sit at the bottom of the phone frame in normal flow.
  - If you build the sketch with a script (handy for repeated frames), wrap it in `(function(){ … })()`. A top-level name like `top`, `name` or `status` clashes with browser globals, the script dies, and the user sees an empty sketch. Prefer plain HTML when the sketch is small.
- Real look, not wireframes: the app's colors and Inter, Norwegian copy, and the real data you saw in step 1 (real names, services, prices).
- One recommended version, desktop and phone. For a multi-step flow, show the steps as phone frames in a row instead.
- Apply the color level from `references/design-language.md` ("Fargenivå B"): groups, people and sections get their category tint so different things look different and the page feels alive, while blue stays reserved for actions and "now".

### 5. Say what changes, then wait

After the sketch, write a short list of what is different from today (3–6 bullets, plain words), anything that needs backend work, and at most one open choice. Then stop and wait for "Build it" (or the Norwegian equivalent). Do not change code before that.

### 6. Iterate and record taste

The user often asks to trim further or change a detail. Redraw only what changed.

When feedback is a general rule about how things should look ("never use X", "I like it when…", "too much text", "more color here"), add it to `references/preferences.md` with today's date before redrawing, so every later sketch follows it. One-off tweaks to this page don't go there.

### 7. Build what was approved

- Compose from `~/ui` and the semantic tokens (`app/styles/tokens.css`, `booking-tokens.css` for public booking). If a color or size you need has no token, add the token first instead of hardcoding it.
- Match the sketch; don't add extras that weren't in it.
- Verify in the Browser pane at 375px and 1280px, compare with the sketch, fix differences, and share a screenshot. Run `npm run typecheck` and the tests for touched routes.
- Write the e2e test for the screen's flow and run it (ui-rules, rule 8). The build isn't done until it passes.

## Ground rules that come up every time

- One primary (blue) action per screen. No duplicated controls.
- As little text as possible: titles and labels, no helper paragraphs (see `minimal copy` in the design language).
- Touch targets 44px on phones.
- Everything tappable is obviously tappable: whole-row links with a chevron, real buttons.
