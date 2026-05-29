# Phase 6 — Visual reference for forward testing

This doc is the **ground truth for what `/{11,13,17}/` must look like in the
typed app**. Every Phase 6 / Phase 7 session must skim it before
restyling the shell or capturing Playwright baselines.

The byte-for-byte legacy oracle in `/legacy/{N}/` is the
production-equivalence target for code; the **live production deploys** below
are the target for **visual layout, responsive behavior, and interaction
flow**. Both must agree.

---

## Live production URLs (visual layout oracle)

| Mission   | Live URL                                | Splash button to reach the app                     |
| --------- | --------------------------------------- | -------------------------------------------------- |
| Apollo 11 | https://apolloinrealtime.org/11/        | T-MINUS 1M (pre-launch) or NOW (in-progress)       |
| Apollo 13 | https://apolloinrealtime.org/13/        | T-MINUS 1M or NOW                                  |
| Apollo 17 | https://apolloinrealtime.org/17/        | T-MINUS 1M or NOW                                  |
| Landing   | https://apolloinrealtime.org/           | (used for cross-mission landing page in Phase 7)   |

The splash screen is its own DOM (`.splash-content`). Clicking either
launch button hides splash (`body.removeClass("splash-loaded")`) and
reveals the app shell underneath. The Phase 6 typed app skips the
splash for now and lands the user directly on the app; Phase 6.5 will
add the splash flow back.

**To re-verify production layout** in a Chromium session:

```bash
# Navigate then click NOW to enter the app
chrome_devtools_navigate https://apolloinrealtime.org/11/
chrome_devtools_evaluate "Array.from(document.querySelectorAll('.splash-btn')).find(b => b.textContent.trim() === 'NOW').click()"
# Wait ~5s for the YouTube player + transcript to load
chrome_devtools_screenshot
```

---

## Production layout summary (measured 2026-05-29 @ 1667×1005)

The production app is a **three-column** layout under the header:

```
┌────────────────────────────────────────────────────────────────────────┐
│ HEADER (~147 px tall)                                                  │
│  ┌─────┬──────────────────┬───────────────────────────────────────┐    │
│  │logo │ Title / pre-title │  Navigator timeline (Paper.js canvas) │   │
│  │     │ Date / GET input  │  3-tier zoom (tier1, tier2, tier3)    │   │
│  └─────┴──────────────────┴───────────────────────────────────────┘    │
├──────────────────────────┬──────┬──────────────────────────────────────┤
│ VIDEO BLOCK (~40%)       │ CH   │ PHOTO BLOCK (~56%)                   │
│  ┌─────────────────────┐ │ FOD  │  ┌─PHOTOGRAPHY ─ MOCR AUDIO ─ ASM─┐ │
│  │ Mission Status      │ │MSN DR│  │                              │   │
│  │  (dashboard overlay)│ │FLIGHT│  │   Big photo viewer           │ ▣ │
│  │  Mission Day        │ │FLT-L │  │   (or YouTube iframe when    │ ▣ │
│  │  Crew Status        │ │FLT-R │  │    in a video segment)       │ ▣ │
│  │  Wake-up timer      │ │CAPCOM│  │                              │ ▣ │
│  └─────────────────────┘ │ ...  │  │                              │ ▣ │
│  ┌─────────────────────┐ │ ...  │  └──────────────────────────────┘ ▣ │
│  │TRANSCR│MILES│COMMENT│ │ ~70 │   (right edge = thumbnail rail)     │
│  └─────────────────────┘ │ wide │                                      │
│  ┌─search/share/pause  ┐ │  │   │                                      │
│  └─────────────────────┘ │ ▼  │   │                                      │
│  ┌─────────────────────┐ │ scrl│                                      │
│  │ Transcript scroll   │ │     │                                      │
│  │   086:51:35 Public  │ │     │                                      │
│  │   Affairs ...       │ │     │                                      │
│  └─────────────────────┘ │     │                                      │
└──────────────────────────┴──────┴──────────────────────────────────────┘
```

**Measured at 1667×1005:**

- Header: full-width, 147 px
- Video block: x=0–667, width 667 (40%)
- Channels strip: x=667–737, width 70 (4%)
- Photo block: x=737–1666, width 929 (56%)
- All three middle columns share height ≈ 861 px

**Corrected key insight (verified in Chrome against production):**
the **video player lives in the left column**, underneath the Mission
Status dashboard overlay. The dashboard is visible by default, but
legacy `manageOverlaysAutodisplay()` hides it automatically when the
current GET enters a video URL segment, revealing the YouTube player
underneath; it reappears outside video segments unless the user manually
toggled it. The photo viewer is still the big right-side area with a
thumbnail rail on the far-right edge. Mission Control Channels is a
**narrow vertical strip** between the video/transcript column and the
photo column, **not** a wide grid in a sidebar.

The Phase 6 first-pass typed shell laid out video + transcript on the
left and a wide side rail on the right with channels-on-top +
photo-on-bottom. **Phase 6.5 restructures to the production 3-column
layout above** before Playwright visual diff can pass.

---

## Per-mission layout deltas (from production)

| Mission | Photo container class      | Notes                                                                      |
| ------- | -------------------------- | -------------------------------------------------------------------------- |
| A11     | `.app-with-tabs-block`     | Photography / MOCR Audio / Astromaterial Samples tabs                      |
| A13     | `.app-with-tabs-block`     | Photography / MOCR Audio / Spacecraft tabs                                 |
| A17     | `.photo-block`             | No tabs; just the photo viewer + gallery                                   |

A17 also drops the MOCR audio panel; the channel grid is not present.

---

## Header detail (production)

The header is a horizontal flexbox:

- Left: insignia patch (clickable → goes to `/`)
- Center-left: pre-title (small caps), title ("Apollo 11"),
  subtitle ("Real-Time Mission Experience"), date / time, then a row of
  `Ground Elapsed Time (GET): [input] [GO]`
- Right: navigator monitor (Paper.js canvas spans ~70% of header width)

The navigator shows **three vertically stacked tier bars**:
- Tier 1 (full mission, ~5–10 px tall) — colored bands for stages
- Tier 2 (zoomed-in window with handles) — ~50 px tall, shows
  half-hour ticks + labeled chapter labels
- Tier 3 (super-zoomed) — ~30 px tall, shows the playhead's
  exact-second window with mission-stage label overlays

The typed `NavigatorRenderer` already paints all three tiers; the shell
just needs to give the canvas its full ~700 px width.

---

## Video / left-column detail

The left column top monitor contains `#player` and the Mission Status
`.dashboard-overlay` in the same physical slot. The video iframe plays
underneath; the dashboard overlay is shown by default and hides at
specific times when the current GET is inside a video URL segment
(legacy `manageOverlaysAutodisplay`). Manual dashboard toggles disable
auto show/hide until the next seek.

Left column holds:
1. **Video monitor + Mission Status overlay** — dashboard: mission day,
   phase, crew status, wake-up timer, distance/velocity. Toggled via the
   `🎚` dashboard button. The `#dashboardContent` element fills this
   overlay, while `#player` remains underneath.
2. **Tab strip** — TRANSCRIPT / MISSION MILESTONES / COMMENTARY + small
   action buttons (search, history, share, fullscreen, sound,
   pause/play).
3. **Tabbed text panel** — transcript / TOC / commentary scrolling list
   (the `#utteranceTable`, `#commentaryTable`, `#iFrameTOC`).

---

## Channel strip detail

A vertical column ~70 px wide (`.thirtytrack-block`). Each row is one
channel button (`.thirtybtn-channel`) showing the role abbreviation
(CAPCOM, FIDO, GUIDO, RETRO, etc.). The selected channel highlights
with the mission accent color. The MOCRviz overlay (when
`features.mocrviz === true`) appears on top of `.thirtytrack-overlay`,
not in the channel strip itself.

---

## Photo / right-column detail

`#photoGallery` is the **thumbnail rail on the far right edge** (one
column of ~6–8 thumbnails). `#photodiv` is the big photo viewer to its
left. Clicking a thumbnail seeks to that photo's GET.

When the YouTube video is active, `#player` overlays this whole area.

---

## Where the Phase 6 typed shell stands (2026-05-29 end of session)

What works:
- 3-row grid (header / main / debug)
- Header layout (patch / info / navigator) at desktop ✓
- GET input + GO button wired with `airt:seek` dispatch ✓
- Transcript / TOC / Commentary tab switching ✓
- Navigator renderer mounted with overlays ✓
- All 8 typed panels mount and tick at 1 Hz against a shared seconds ref ✓
- MOCRviz audio panel auto-mounts for A11/A13 ✓
- Per-mission accent tokens (A11 green, A13 orange, A17 blue) ✓
- Responsive breakpoints (1024, 900, 640) at the right places ✓
- `?debug=1` reveals a diagnostic readout host ✓

What's wrong / not yet matching production:
1. **Main layout is 2-column** (video-left, side-rail-right) but should
   be **3-column** (video/transcript-left, channels-mid, photo-right).
2. **Dashboard overlay behavior is incomplete**; production shows it by
   default over the left-column video and auto-hides it when current GET
   is inside a video URL segment unless manually toggled.
3. **Channels are in a grid** (a few rows × ~6 cols); should be a single
   vertical strip.
4. **Photo gallery is a horizontal scroll** below the photo viewer;
   should be a vertical rail on the far-right edge.
6. **No splash screen** at all yet; production starts with one.
7. **No play/pause, sound, share, fullscreen, dashboard, search,
   help buttons.** Phase 6 plan calls these out in the "tabs" section.
8. **CSS visual styling is generic** (modern flat dark theme with
   our own tokens); production uses specific NASA-ish typography
   (Roboto Slab title) and warmer per-mission accents.

**Phase 6.5 priorities (next session):**
1. Restructure `src/app/shell.ts` from 2-col to 3-col grid.
2. Keep `#player` in the left top monitor under the default-visible
   `#dashboardContent` overlay; auto-hide dashboard during video URL
   segments.
3. Convert channel grid to vertical strip in `.airt-channels__list`.
4. Convert photo gallery to vertical rail on the right edge of the photo block.
5. Add the small-action button row (search, share, pause, sound,
   fullscreen, help) — these can be no-op handlers for now.
6. Visual-tune the type scale + accents against production.

After 6.5, Playwright visual diff is unblocked and Phase 6 can exit.

---

## Visual diff checklist (Playwright targets)

Once the layout is restructured, capture baselines for each combo:

| Mission | GET                                | Viewport (px)    |
| ------- | ---------------------------------- | ---------------- |
| 11      | pre-launch, launch, key-event-1,   | 1440×900 (desk), |
|         | key-event-2, final-phase, end      | 768×1024 (tab),  |
| 13      | (same six snapshots)               | 390×844 (phone)  |
| 17      | (same six snapshots)               |                  |

Total: 3 missions × 6 GETs × 3 viewports = 54 baselines (matches the
Phase 0 inventory). Compare each against:
1. The legacy oracle at `/legacy/{N}/` (DOM equivalence)
2. The production deploy at `apolloinrealtime.org/{N}/` (visual layout)

Diff threshold per `docs-plan/05-migration-plan.md` Verification §4.

---

## Notes on the splash screen (deferred)

Production opens with a full-screen splash (mission patch, mission
description, "T-MINUS 1M" + "NOW" + "Fullscreen" buttons, list of
"Included real-time elements", forum link). Clicking a launch button
sets `body.splash-loaded` → false and reveals the app under it.

The typed shell currently skips this — users land directly in the app
at the historic-launch GET. Phase 6.5 (or Phase 7) will reintroduce
the splash as a typed `src/app/splash.ts` component that calls into
`renderShell` on dismissal.
