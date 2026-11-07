# Test Results

Run on 2026-11-07 from the project root with Node v22.18.0.

## Build

| Step | Command | Result |
|------|---------|--------|
| Parse check | `for f in src/*.js public/*.js test/*.js; do node --check "$f"; done` | Success, no file failed |
| Compile or bundle | none needed | Not applicable |

## Unit and API Tests

Command (the one command in `unit-test-instructions.md`, run once; `npm test` runs the same files): `node --test test/model.test.js test/repository.test.js test/allocate.test.js test/checks.test.js test/measures.test.js test/explain.test.js test/api.test.js test/view-model.test.js`

| Total | Passed | Failed | Skipped |
|-------|--------|--------|---------|
| 40 | 40 | 0 | 0 |

Exit code 0. No failures to detail.

## Coverage

No coverage report was produced. The `poc` scope sets no line-coverage floor and the test strategy sets none, so none is required. No coverage threshold exists to lower or skip.

## Smoke Run Against the Real Server

The real server was started on a free port on 127.0.0.1 and called once:

| Check | Result |
|-------|--------|
| `GET /api/plan` | 200 in 65 ms, with the plan, flags, measures and totals |
| `GET /` | 200, 1560 bytes |

## Where Browser Behavior Was Checked

Browser behavior was **not** checked in a real browser engine. The view model and HTML attributes are tested in Node only (`test/view-model.test.js`), and the page was fetched as text. The click handling in `public/app.js` is untested. These are Node results, not browser or end-to-end evidence.

## Loop-Back Log

None. No failure occurred.
