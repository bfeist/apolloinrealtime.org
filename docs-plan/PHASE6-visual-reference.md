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

The May 2026 reference measurement at 1667 x 1005 found a roughly 147 px
header, 40% left column, 70 px channel strip, and remaining width for the
right content. These are reference proportions, not fixed dimensions to
force on every viewport. Recheck in the browser before tuning.

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

Typography comes from the actual legacy CSS and rendered browser. The old
source inventory mentions Michroma, Oswald, Roboto Mono, and Roboto Slab in
different roles; it is not evidence that every mission title uses Roboto
Slab. Avoid guessing a new typographic theme from the old prose.

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

The audio engine may be implemented incrementally, but a native audio
control and button grid alone cannot satisfy the product contract. Empty
recording periods, unavailable data, and media errors should be visible and
truthful. Never fabricate waveform/activity data to imitate a screenshot.

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
