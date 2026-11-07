# Code Generation Plan

## Summary

- Builds: PantryShare, a Node.js web app where the coordinator sees a weekly allocation with expiry, fairness and nutrition flags, explanations, and can adjust quantities.
- Touches: new files at the project root (`package.json`, `src/`, `public/`, `test/`); existing files (`README.md`, `PantrySharePRD.html`, `.gitignore`, `.mcp.json`) are left as they are.
- Tests: about 16 requirement-driven unit and API tests with Node's built-in runner, no packages to install.

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run that layer's tests.",
  "scope": "poc",
  "test_strategy": "minimal",
  "project_type": "greenfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "minimal",
    "strategy_volume": [
      "One verifiable test per requirement at the narrowest effective level.",
      "At least one happy-path unit test per component.",
      "Unit tests are the default; a bugfix/security scope floor may require an integration or E2E regression when that is the narrowest level that reproduces the defect."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Bootstrap the minimal test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:c5db1280ba0333b655bcf97bdcaeaa0fd9cc0f50807a6ee879935b8aff3e17e0",
  "contract_sha256": "sha256:be5041ec2297dded1a31f328fae6a86555cf649f231018ea8168c9bb8dd811a5"
}
```

## Technology and Layout

Node.js 22, plain JavaScript (ES modules), no packages to install. Node's built-in server and `node:test` runner. The browser page is plain HTML, CSS and JavaScript.

```
package.json            scripts: start, test
src/model.js            data shapes and validation
src/sample-data.js      built-in synthetic data (seeded, repeatable)
src/repository.js       in-memory store, unit conversion, expiry overrides, exclusions, adjustments
src/allocate.js         allocation engine
src/checks.js           expiry, fairness, missed-pickup and nutrition flags
src/measures.js         spoilage and fairness measures against baselines
src/explain.js          per-allocation explanations
src/server.js           HTTP server and JSON API
public/                 index.html, app.js, view-model.js, styles.css
test/                   one test file per component
```

## Decisions Made in This Plan

These fill gaps the requirements left open (the reviewer's findings R-06 to R-10). They are stated here so they can be changed.

- **D1 Fair share with ineligible partners (R-06):** an item's fair share for a partner is its share of total households (all included partners) applied to that item's stock. A partner barred from an item (no suitable storage, or the item expires before its next pickup) gets none of it, and that share stays unallocated and is flagged (Q10). For the fairness test, a partner is compared only on items it is eligible for, so being barred never counts against it.
- **D2 Fairness test unit (R-07):** the 20 percent band is tested on a partner's total allocated weight across its eligible items, against the sum of its fair shares of those items.
- **D3 Perishable and storage (R-08):** dairy and meat are perishable. Dairy needs refrigeration. Frozen meat needs a freezer. Produce and dry goods are not perishable and need no special storage.
- **D4 Shortfall (R-09):** shortfall is the partner's requested quantity minus its allocated quantity, shown for display only. Requests never change quantities (FR4.2).
- **D5 Data fields (R-10):** missed pickups come from the `pickups` records (a partner whose last week's pickup record is `collected: false`). Stock already expired on the plan date is excluded from stock on hand.
- **D6 Plan date:** the plan is built for Monday 2026-11-09; each partner has one weekly pickup weekday. Sample data comes from a fixed seed so the same data always gives the same plan (NFR4).

## Steps

- [x] **Step 1: Project structure and production configuration skeleton.** Create `package.json` (module type, `start` and `test` scripts), and the `src/`, `public/` and `test/` folders. Traceability: all requirements.
- [x] **Step 2: Bootstrap the minimal test runner.** Use Node's built-in `node --test`; no config file needed. Record the exact unit-scoped commands in `unit-test-instructions.md`. Traceability: all requirements.
- [x] **Step 3: Data model, implement.** `src/model.js` (inventory item, partner, pickup record, request, nutrition target, plan, allocation line) and `src/sample-data.js` (60 partners, about 14 inventory lines in several units, 13 weeks of past allocations and pickups, requests, nutrition targets, seeded). Traceability: FR1.1, NFR1.
- [x] **Step 4: Data model, write and run its tests.** `test/model.test.js` covers FR1.1 and NFR1 (60 partners, required fields, no personal client fields) and an invalid-record edge case.
- [x] **Step 5: Repository, implement.** `src/repository.js`: load sample data at start, conversion factors, expiry overrides, exclusion of partners with missing or zero households, and coordinator adjustments. Traceability: FR1.1, FR1.2, FR1.3, FR1.4, FR5.1.
- [x] **Step 6: Repository, write and run its tests.** `test/repository.test.js` covers FR1.2, FR1.3, FR1.4 (happy path plus each flagged-and-left-out edge case).
- [x] **Step 7: Business logic, implement.** `src/allocate.js` (need, fair share, soonest-first up to fair share, storage and pickup rules, surplus left flagged, shortfall), `src/checks.js` (3-day expiry flag, 20 percent fairness flag, missed-pickup flag, nutrition flag), `src/measures.js` (spoilage and fairness measures, baselines, weekly comparison), `src/explain.js` (reason for every line). Traceability: FR2.1 to FR2.8, FR3.1 to FR3.4, FR4.1, FR4.2, FR6.1, FR6.2, NFR2, NFR4.
- [x] **Step 8: Business logic, write and run its tests.** `test/allocate.test.js`, `test/checks.test.js`, `test/measures.test.js`, `test/explain.test.js`. Covers the UAT cases: normal week, large short-dated dairy donation, partner without refrigeration, partner that missed pickup, rural partner with growing need, mixed units, requests above stock.
- [x] **Step 9: API, implement.** `src/server.js`: `GET /api/plan`, `POST /api/adjust`, `POST /api/settings` (conversion factor, expiry date), static files from `public/`. Input validation and error responses at the boundary. Traceability: FR5.1, FR5.2, NFR3.
- [x] **Step 10: API, write and run its tests.** `test/api.test.js` covers FR5.1 (adjust updates totals and storage warning), FR5.2 (a coordinator adjustment is kept and never overwritten), NFR3 (adjust responds under 2 seconds), and a bad-input error case.
- [x] **Step 11: Frontend, implement.** `public/index.html`, `app.js`, `view-model.js`, `styles.css`: plan table by partner and item, flag badges, explanation panel, request notes, adjust control, totals and storage warnings, measures panel. `data-testid` on interactive elements. Traceability: FR3, FR4, FR5, FR6.
- [x] **Step 12: Frontend behavior, write and run its tests.** `test/view-model.test.js` tests the view model (flags, totals, formatting) and that interactive elements carry `data-testid`.
- [x] **Step 13: Environment and build configuration.** Finish `package.json` scripts; the server reads its port from the `PORT` environment variable (default 3000). No secrets.
- [x] **Step 14: Documentation and traceability.** Write `code-summary.md` (what was built, how to run it, decisions D1 to D6, anything not run) and `traceability.json`. Leave the existing `README.md` as it is.

## Requirement to Step Map

| Requirement | Steps |
|-------------|-------|
| FR1.1 | 3, 4, 5 |
| FR1.2, FR1.3, FR1.4 | 5, 6 |
| FR2.1 to FR2.8 | 7, 8 |
| FR3.1 to FR3.4 | 7, 8, 11, 12 |
| FR4.1, FR4.2 | 7, 8, 11 |
| FR5.1, FR5.2 | 5, 9, 10, 11 |
| FR6.1, FR6.2 | 7, 8, 11 |
| NFR1 | 3, 4 |
| NFR2 | 7, 8 |
| NFR3 | 9, 10 |
| NFR4 | 3, 7, 8 |
