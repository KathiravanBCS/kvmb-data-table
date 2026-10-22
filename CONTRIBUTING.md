# Contributing

Thanks for helping improve the grid!

## Setup

```bash
npm install          # npm ≥ 11 recommended
npm run docs:dev     # docs + live playground at http://127.0.0.1:5173
```

The docs import the library **source** (`src/`), so changes show up in the demos straight away.

## Before opening a pull request

```bash
npm run format:check && npm run lint && npm run typecheck
npm run test && npm run test:types
npm run build && npm run check:exports
npm run test:e2e        # when you touch rendering, interaction or styles
```

- Add tests alongside every behaviour change: unit tests in `tests/unit`, component tests in `tests/integration`, browser flows in `tests/e2e`.
- Keep public exports deliberate. Anything new in `src/index.ts` or `src/export/index.ts` is public API.
- Never hard-code colors. Use Mantine CSS variables or the `--dg-*` variables in `src/styles/data-grid.css`.
- New interactive UI needs an accessible name and keyboard support. The axe tests should keep passing in light and dark mode.
- Add an entry under **Unreleased** in `CHANGELOG.md`.

## Releasing (maintainers)

1. Move the **Unreleased** notes into a new version section and run `npm version <patch|minor|major>`.
2. Push the tag, then run the **Release** workflow by hand. It repeats all checks and publishes from the protected `npm-publish` environment, which requires approval.
