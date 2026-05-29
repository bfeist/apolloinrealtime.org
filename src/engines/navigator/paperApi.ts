/**
 * Minimal structural typings for the subset of the Paper.js API the
 * navigator renderer uses.
 *
 * Paper.js is loaded as a classic `<script>` (it sets `window.paper`) and
 * passed into the renderer by injection — there is no `import paper` and no
 * global reference inside this module. That keeps the renderer dependency-
 * free (per the longevity principle in `docs-plan/00-decisions.md` A2b) and
 * unit-testable with a hand-written mock that satisfies {@link PaperScopeLike}.
 *
 * Only the constructors/members actually exercised by
 * `src/engines/navigator/renderer.ts` are modelled. Expand as the renderer
 * grows (tier-3 scrolling, data overlays) in later phases.
 *
 * All types have moved to src/types/navigator.d.ts as ambient declarations.
 */
