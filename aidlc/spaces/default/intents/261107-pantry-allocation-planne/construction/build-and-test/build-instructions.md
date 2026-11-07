# Build Instructions

Sources: the technology and layout in `code-generation-plan.md`, and the files and run notes in `code-summary.md` (both under `construction/code-generation/`), plus the test commands in `unit-test-instructions.md`.

## Dependency Installation

None. PantryShare uses Node.js 22 or newer and no packages, so there is no install step and no `node_modules` folder.

## Environment Setup

- Node.js 22 or newer (checked here with v22.18.0).
- Optional: `PORT` sets the server port (default 3000). No other environment variables, config files or local services are needed. No secrets are used.

## Build Commands

There is no compile, bundle or transpile step. The source runs as written.

## Build Verification

1. Check that every JavaScript file parses: `for f in src/*.js public/*.js test/*.js; do node --check "$f"; done`
2. Run the tests: `npm test` (the same eight test files as `unit-test-instructions.md`).
3. Start the app: `npm start`, then open http://localhost:3000. The page should show the weekly plan for 60 partners.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `SyntaxError` on import or `Cannot use import statement` | Node older than 22, or `type: module` missing | Use Node 22 or newer; keep `"type": "module"` in `package.json` |
| `EADDRINUSE` on start | Port already in use | Start with another port, for example `PORT=3100 npm start` |
| API tests fail to connect | A firewall blocks local connections | The tests use a random free port on 127.0.0.1; allow local connections |
