# Source walkthrough

The application uses React, TypeScript, React Router, Zustand, and TanStack
Query. It builds to static files with Vite; mission assets and media retain
their existing URLs.

## Start with these files

1. [`app/missionApp.ts`](app/missionApp.ts) mounts React.
2. [`App.tsx`](App.tsx) supplies the query client and router. Mission route
   loaders initialize the shared clock and deep-link state before mounting.
3. [`pages/MissionPage.tsx`](pages/MissionPage.tsx) composes the mission shell,
   controls, and panels. [`pages/LandingPage.tsx`](pages/LandingPage.tsx) owns
   the original mission-selection page.
4. [`components/`](components/) contains feature JSX, local interaction state,
   and the effects that connect media or canvas engines to React.

## State and data are separate

[`store/missionStore.ts`](store/missionStore.ts) holds the selected mission
time (GET seconds), playback/mute state, selected tabs/channel, and shared
actions. Subscribe only to the fields a component uses:

```tsx
const seconds = useMissionStore((state) => state.seconds);
const seek = useMissionStore((state) => state.seek);
```

A timestamp button calls `seek(seconds)`. The store updates, and subscribed
components derive their current transcript row, photo, telemetry, and media
position from that same time. The route owns the ticker; the pure
[`app/playback.ts`](app/playback.ts) clock measures elapsed time. Components
must not start independent mission clocks. Keep drafts, disclosure state,
and other component-only interactions in `useState`.

Fetched data follows the pattern used by `../issirt`: typed fetchers in
[`api/dataFetchers.ts`](api/dataFetchers.ts), query hooks in
[`api/useMissionData.ts`](api/useMissionData.ts), and a shared
[`api/queryClient.ts`](api/queryClient.ts). Fetchers reuse the parsers in
[`data/`](data/); mission keys prevent one mission's records from appearing
in another. Components render query loading/error states and derive current
entries from query data plus GET. Do not copy query results into Zustand.
Specialized sample, biometric, and MOCR queries live alongside those components.

## Where to make changes

| Change                                               | Start here                                               |
| ---------------------------------------------------- | -------------------------------------------------------- |
| Mission layout or visible controls                   | `pages/MissionPage.tsx`, `components/layout/`, `styles/` |
| Transcript, photography, dashboard, or another panel | Corresponding folder in `components/`                    |
| A shared user action                                 | `store/missionStore.ts`                                  |
| CSV format or time-indexed lookup                    | `data/` and its unit tests                               |
| Fetching or caching mission data                     | `api/`, or the feature's query hook                      |
| Mission-specific labels, bounds, or URLs             | `missions/` and `types/`                                 |
| Navigator/YouTube behavior                           | `engines/` and the component that owns the integration   |

React renders UI. Canvas renderers and browser media APIs remain imperative
leaf integrations: create them in effects using refs, synchronize them with
store state, and clean up timers/listeners/media on unmount. Pure helpers
remain separate from JSX where that makes parsing and timeline logic easier
to understand and test.

Run `npm run check` and `npm run build` after changes. For UI behavior, run
the applicable Playwright checks in `tests/`; compare the same mission, GET,
viewport, and tab against the existing app. Runtime assets in
`public/{11,13,17}/` are read-only during application work. The full experience
and preservation contracts are in [`docs-plan/`](../docs-plan/README.md).
