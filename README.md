# Apollo in Real Time v2 (AiRT2)

One shared static application for Apollo 11, 13, and 17, replacing three
related websites that evolved independently. Local recovery is complete;
release audits and production cutover remain outstanding.

The goal is to preserve the recognizable mission experience: synchronized
audio and video, mission timeline, transcripts, commentary, photography,
and Mission Control audio. See the [product contract and documentation
map](docs-plan/README.md) for the intended experience and acceptance criteria.

## Development

Use the Node version in `.nvmrc`, then:

```bash
npm ci
npm run dev
```

| URL                                        | Purpose                                                |
| ------------------------------------------ | ------------------------------------------------------ |
| `http://localhost:5173/`                   | Mission picker                                         |
| `http://localhost:5173/{11,13,17}/`        | Shared typed application                               |
| `http://localhost:5173/legacy/{11,13,17}/` | Original applications for comparison, development only |
| `http://localhost:5173/dev/`               | Module smoke harness                                   |

Run `npm run check` for TypeScript, lint, formatting, and unit tests.
Run `npm run build` and `npm run preview` to verify the static build.
Browser and visual verification are defined in the
[remaining release plan](docs-plan/05-migration-plan.md).

## Continuing the work

Read [AGENTS.md](AGENTS.md), then the
[progress tracker](docs-plan/08-progress-tracker.md) and
[remaining release plan](docs-plan/05-migration-plan.md), in that order.
The tracker records actual verification and remaining work; the existence
of modules and passing unit tests does not establish product parity.

New application code belongs in `src/`. The original source trees and
copied legacy assets remain read-only reference material. Their provenance
is documented in [legacy/LEGACY.md](legacy/LEGACY.md).
