# Unit Test Instructions

## Framework and Setup

- Runner: Node's built-in test runner (`node:test`) on Node 22. No packages to install, no configuration file.
- Tests are plain ES modules under `test/`, one file per component.

## How to Run

Run these from the project root. Each command names exact test files.

| Component | Command |
|-----------|---------|
| Data model | `node --test test/model.test.js` |
| Repository | `node --test test/repository.test.js` |
| Allocation | `node --test test/allocate.test.js` |
| Checks | `node --test test/checks.test.js` |
| Measures | `node --test test/measures.test.js` |
| Explanations | `node --test test/explain.test.js` |
| API | `node --test test/api.test.js` |
| View model | `node --test test/view-model.test.js` |

All at once (exact files, in order): `node --test test/model.test.js test/repository.test.js test/allocate.test.js test/checks.test.js test/measures.test.js test/explain.test.js test/api.test.js test/view-model.test.js`

## Test Volume

Minimal strategy: about one test per requirement, at least one happy-path test per component, plus the error and edge cases the project rules ask for. Around 16 tests in total.

| File | What it checks | Requirements |
|------|----------------|--------------|
| model.test.js | 60 partners and required fields load; no personal client fields; invalid record is rejected | FR1.1, NFR1 |
| repository.test.js | Conversion factor merges units; item without a factor is left out and flagged; missing expiry left out until set; partner with zero households left out and flagged | FR1.2, FR1.3, FR1.4 |
| allocate.test.js | Soonest-expiring stock first up to fair share; no perishables without storage; no perishable after it expires before pickup; surplus left unallocated and flagged; requests above stock share by need with shortfall | FR2.1 to FR2.8 |
| checks.test.js | 3-day expiry flag; 20 percent fairness flag (25 percent flagged, exactly 20 not); missed-pickup flag keeps allocation; nutrition flag 10 points below target | FR3.1 to FR3.4 |
| measures.test.js | Spoilage percent and weekly comparison against baseline; fairness pass or fail; same data gives the same plan | FR6.1, FR6.2, NFR4 |
| explain.test.js | Every allocation line has an explanation naming need, storage, expiry and pickup; requests shown but do not change quantities | FR4.1, FR4.2, NFR2 |
| api.test.js | Adjust updates totals and storage warning; coordinator adjustment is kept; adjust responds in under 2 seconds; bad input returns an error | FR5.1, FR5.2, NFR3 |
| view-model.test.js | Flags and totals shown correctly; interactive elements carry `data-testid` | FR3, FR5 |

## Expected Coverage

The `poc` scope adds no line-coverage floor. Every requirement above has at least one test. No coverage threshold is set, and none may be added or lowered to make a run pass.

## Mocking and Stubbing

- No mocks of the allocation logic. Tests call the real functions with small hand-built data sets.
- The API tests start the real server on a random free port and call it with `fetch`.
- No clock mocking is needed: the plan date is passed in as data.

## Test Data

- Large cases use the built-in sample data (fixed seed, so it is identical every run).
- Edge cases use small data built inside each test, so a test reads on its own.
