# Visual reference for the shared mission application

Use live [Apollo 11](https://apolloinrealtime.org/11/),
[Apollo 13](https://apolloinrealtime.org/13/), and
[Apollo 17](https://apolloinrealtime.org/17/) as the visual and interaction
references. Local `/legacy/{N}/` provides the preserved source application.
This document describes the target structure, not the current typed app's
completion status. See the tracker for observed gaps and evidence.

The September 2026 goal is recognizable, usable parity. Exact pixel equality
is unnecessary. Preserve the information hierarchy, proportions, real
content, and useful interactions; fix overflow and reflow for smaller screens.

## Compare equivalent states

1. Open production and the typed app in visible browser windows.
2. Enter production past the splash using its launch/start control.
3. Select the same mission, GET, viewport, and panel; pause where possible.
4. Wait for fonts, data, and visible media to settle. Record blocked media
   separately from layout defects.
5. Capture and inspect screenshots before and after changes. Use actual
   browser-observed positions when old prose and the screen disagree.

Use the snapshot GET table in [05-migration-plan.md](05-migration-plan.md).
Also inspect the open MOCR panel for A11 and A13: the standard photography
screenshots cannot prove that MOCRviz works. Phone/tablet acceptance concerns
the unified responsive app; legacy mobile redirects are not its layout spec.

## Desktop structure

At a 1667 × 1005 reference viewport, production uses a roughly 147 px header,
40% left column, 70 px channel strip, and the remaining width for right-side
content. These are reference proportions, not fixed dimensions. Recheck them
in the browser before tuning.

```text
+-------------------------------------------------------------------+
| Mission patch / title / historic date / GET | Three-tier navigator |
+---------------------------+------+--------------------------------+
| Video monitor             |      | Photography / MOCR tabs        |
| Mission Status overlay    | MOCR |                                |
| (same physical slot)      | chan.| Large photo viewer | Thumb rail|
+---------------------------+ strip|                    |           |
| Transcript / Milestones / |      | OR Mission Control room,       |
| Commentary + controls     |      | waveform, activity, transcript |
+---------------------------+      |                                |
| Scrollable text panel     |      |                                |
+---------------------------+------+--------------------------------+
```

The video player is in the **left top monitor**, underneath the Mission
Status overlay. It never moves into the photography area as video segments
change. The dashboard is normally visible outside video segments; automatic
and manual visibility must follow the reference behavior.

A11/A13's channels form a narrow vertical strip. Opening MOCR audio uses the
large right content area. The channel strip itself is not the visualization.
A17 has no current MOCR panel or strip and uses that width for its photo area.

## Header and left area

The header presents the mission patch, mission title/subtitle, historical
date/time, editable GET and Go control, and a three-tier navigator. Preserve
usable canvas width and legible labels rather than squeezing the canvas next
to an oversized title. Navigator hit targets and displayed timeline must
match after resizing.

The upper left monitor contains the video and dashboard layers. Below it
are Transcript / Mission Milestones / Commentary tabs and transport/action
controls. The lower text area scrolls within the available viewport space.
A large transcript must not expand the entire application height or force
controls offscreen. Search replaces or overlays the appropriate content and
can be dismissed without losing access to navigation.

Typography comes from the legacy CSS and rendered production browser. Verify
the mission and component before changing typefaces or weights.

## Button contract

These measurements come from live production. Inspect component crops at native
size as well as the whole page before accepting a new reference.

- Text and app tabs: 38 px high, Oswald 12 px / weight 400, left/top-aligned
  labels with 7.8 px top/side padding, 4 px rounded corners on all four corners.
  Gray face `#8e8e8e`, right/bottom 1 px `#8c8c8c` edges, inset shadow
  `-1px -1px 7px 3px rgba(0,0,0,.25)`. Selected/hover face `#7bbfd8`
  with the original subtle white text shadow. No flat teal rectangles.
- Action controls: three columns of two 18 px icon buttons, then two full-height
  buttons labeled Share and Play/Pause. Gaps are 2 px. Original vector icons
  are 15 px; action hover/dashboard-active uses `#ffc688`. Play and sound
  artwork must track the actual transport state, without emoji or text substitutes.
- Desktop text tabs/actions divide the available row about 3 : 1.666.
  App tabs are 140 px wide when space allows. A17 has the same left controls;
  its original photography area has no corresponding app-tab row.
- Mission channels: 70 px column, 18 px buttons, 2 px vertical gaps, Roboto Mono
  bold 11 px, 1 px vertical / 2 px horizontal padding, 3 px corners and inset shadow.
  Silent face/text: `#292929 / #595959`; speaking: `#636363 / black`;
  selected/hover: `#7cb7e0 / black`. Actual tape activity determines speaking.
  Silence never disables selection. Flex children must not shrink below their
  text height; overflow scrolls. A11 has its own original labels and order.
- Phone layout deliberately puts actions below text tabs, with 28 px small
  buttons and 58 px labeled buttons. Channels form a scrollable three-row strip.
  Check full label bounds and access to the last channel.

`npm run test:controls-reference` opens the live and local sites and compares
rendered button faces plus channel labels/order for all three missions. It
attaches named production/local crops only to ignored Playwright output. This
gate cannot be bypassed by updating typed snapshots. `controls.spec.ts`
separately checks hover/selection, label clipping and last-channel selection
on desktop and phone.

## Right area and photography

A large contained image occupies the right viewer, with caption/attribution
and a vertical thumbnail rail at its far right. Select thumbnails and seek
through time to verify that both the image and selection follow GET. The
rail must remain scrollable while the image retains its aspect ratio.

A11/A13 have right-side app tabs; A17's source uses a simpler photo-only
container. Mission-specific geology/sample/biometric/spacecraft content
needs a feature audit against production; the presence of a legacy selector
is a source clue, not proof that a feature has been implemented or retired.

## MOCRviz is a visualization and listening experience

Inspect production with MOCR Audio open on both A11 and A13. Preserve:

- The room/console arrangement and role labels, using each mission's
  positions and catalog.
- Selection through the room and channel controls, with a clear selected
  role and description.
- Real audio waveform, current playhead, and seek behavior tied to mission
  GET and tape offsets.
- Channel activity over time based on actual activity data.
- The selected channel transcript where available, with current text and
  timestamp navigation synchronized to playback.

A native audio control and button grid alone do not satisfy the product
contract. Empty recording periods, unavailable data, and media errors must be
visible and truthful. Never fabricate waveform or activity data.

## Responsive inspection

Check desktop 1440 x 900, tablet 768 x 1024, and phone 390 x 844, then a
shorter/wider phone orientation when touching reflow rules. A reasonable
responsive arrangement may stack or switch the desktop areas. Every useful
panel and control must remain reachable. Check overflow, active tab
visibility, image containment, scrolling, and room/waveform sizing after
both viewport changes and tab changes.

Production references guide structure; reviewed typed-app screenshots can
then detect accidental visual regressions. Keep those roles distinct and
never replace the production reference images with typed output.
