# PantryShare UAT Report

**Date:** 2026-11-07
**Build:** `main` at `e869d2a` (merged pull request #1), branch `pantryshare-next`
**Source of scenarios:** the seven UAT scenarios on the Validate tab of `PantrySharePRD.html`

## Result

| # | Scenario | Result |
|---|----------|--------|
| UAT-1 | A normal week with enough stock | **Pass** (8 of 8 checks) |
| UAT-2 | A large donation of short-dated dairy | **Pass** (7 of 7 checks), with a gap noted |
| UAT-3 | A partner without refrigeration | **Pass** (6 of 6 checks) |
| UAT-4 | A partner that missed last week's pickup | **Pass** (5 of 5 checks) |
| UAT-5 | A rural partner with growing need | **Partial** (6 of 6 checks pass, but the scenario's intent is only partly met) |
| UAT-6 | An item counted in different units | **Pass** (7 of 7 checks) |
| UAT-7 | Total requests that exceed available stock | **Pass** (8 of 8 checks) |

**Overall:** 5 pass, 1 pass with a gap, 1 partial. Nothing failed outright. Every check was written against the approved requirements, not against what the app happened to do.

## How the tests were run

- The real server code ran for each scenario on a free local port, and every check went through its HTTP API (`GET /api/plan`, `POST /api/adjust`, `POST /api/settings`). Each scenario got a fresh server, so one scenario cannot affect another.
- UAT-2 to UAT-4, UAT-6 and UAT-7 use the built-in sample data (UAT-2 swaps in the brief's 2-tonne yogurt example). UAT-1 and UAT-5 use hand-built data sets, because the sample data does not contain a plain "enough stock" week or a rural partner.
- The script is in the session scratch folder (`uat.mjs`), not in the repository. Results are in `uat-results.json` beside it.
- The page itself was exercised separately in Chrome (click, type, filters, phone width); that run is not repeated here.

## Results in detail

### UAT-1 A normal week with enough stock: Pass

Setup: 6 partners with ample storage, stock matched to the nutrition targets (1,000 kg), small rice requests.

- All 6 partners get a positive quantity of all 4 items.
- Nothing is left unallocated, and no partner or stock flags appear.
- No line carries a warning, and every request is covered.
- Spoilage is 0 percent and fairness has 0 partners outside the 20 percent band.
- Every line has an explanation.

### UAT-2 A large donation of short-dated dairy: Pass, with a gap

Setup A is the brief's example: 2,000 kg of yogurt expiring in 6 days, on the 60-partner sample.
Setup B is the sample's own lot: 600 kg of yogurt expiring in 2 days.

- A: the 9 partners without refrigeration get no yogurt. The others get exactly their fair share (1,705.8 kg), and none gets more.
- A: the 294.2 kg that could not be placed is shown and flagged as unallocated for the coordinator.
- B: the 2-day lot is placed in full, soonest first, and only to partners who collect before it expires (Monday or Tuesday, 18 partners).

**Gap:** the "likely to expire" flag only fires within 3 days of expiry. In the 6-day example it does not fire, and the unplaced yogurt shows only as a generic "unallocated" flag. The brief's example also says four of the twelve partners with refrigeration "have already collected this week". The app has no notion of collecting during the week, so that part of the situation cannot be reproduced.

### UAT-3 A partner without refrigeration: Pass

Partner P18 (refrigeration 0 kg).

- It gets no cheese, milk or yogurt, and its yogurt line explains that it has no refrigeration.
- It still gets 6 non-perishable lines (produce and dry goods).
- A partner without a freezer (P21) gets no meat.
- Forcing 10 kg of yogurt onto P18 by hand is accepted and shows the warning "Grace Food Shelf has no refrigeration for yogurt".

### UAT-4 A partner that missed last week's pickup: Pass

Partners P05, P18 and P42 missed last week in the sample.

- Exactly those three are flagged, and each flag says the allocation is kept for the coordinator to decide.
- Their allocations (190.7, 118.5 and 201.2 kg) are identical to a run where they had collected, so a missed pickup does not cut anything by itself.
- No other partner is flagged.
- The coordinator can still change a flagged partner's line (P05's rice set to 1 kg was accepted).

### UAT-5 A rural partner with growing need: Partial

Setup: the sample plus a rural partner (P61, 120 households) asking for 80 kg of chicken with the note "Serving a growing number of families, asking for more protein", and chicken stock cut to 100 kg.

What works:
- The plan flags that requests for chicken (794 kg) exceed stock (100 kg).
- The 80 kg request and its note show beside the suggestion, with a shortfall of 79.1 kg.
- The coordinator can raise the partner's chicken by hand (to 15 kg); the plan updates and shows the effect (fairness deviation 16.8 percent).

What does not meet the scenario's intent:
- The suggestion is **0.9 kg**, because need is households served only (requirement decision Q1) and requests are display-only (Q13). Asking for 800 kg instead of 80 kg gives the same 0.9 kg.
- The app has no idea of growth or rural need. Growing need only reaches the allocation if the coordinator spots the note and adjusts by hand.

This follows the approved requirements, so it is not a defect against them. It is a gap against what the brief's scenario seems to want ("a rural pantry serving a growing number of families has asked for more protein"). If automatic response to growth matters, the need measure in the requirements needs to change.

### UAT-6 An item counted in different units: Pass

- Yogurt: 600 kg plus 150 cases (1 case = 10 kg) gives 2,100 kg.
- Cheese: 1,500 lb gives 680.4 kg. Apples: 80 crates (1 crate = 18 kg) gives 1,440 kg.
- Canned beans (cases, no conversion factor) are left out and flagged.
- Setting 1 case = 12 kg adds the beans at 720 kg and clears the flag.
- Changing the yogurt case factor to 12 updates yogurt stock to 2,400 kg.
- A bad factor (-3) is refused with "factor must be a number greater than 0".

### UAT-7 Total requests that exceed available stock: Pass

Rice: 5,579 kg requested against 1,200 kg in stock.

- A plan is still produced for all 60 partners, and the shortage is flagged.
- All 1,200 kg is allocated, shared at the same 0.0897 kg per household for every partner.
- The biggest requester (P07, asked for 5,000 kg) gets its fair share, 25.5 kg.
- All 5 requesters see a shortfall, and no partner gets more than its fair share.

## Other observations

- The UAT-1 and UAT-5 data sets were built by me after reading the sample data, and I wrote the checks after seeing how the plan is shaped. The checks follow the requirements, but this is not an independent tester's view.
- Two earlier findings from the browser run still stand: over-stock adjustments are not warned about on the edited line (and show a negative "Unallocated" total), and the same "Nutrition" flag can repeat without naming the category.
- The earlier caveat still applies: spoilage and fairness are measured against synthetic history written for this app, so these UAT results show the behavior works, not that the method cuts spoilage in practice.

## Suggested follow-ups

1. Decide whether growing need should change the suggestion (UAT-5). This is a requirements change, not a bug fix.
2. Consider a clearer "likely to expire" signal for large short-dated lots beyond the 3-day rule (UAT-2).
3. Decide whether to keep the UAT script in the repository so the scenarios can be re-run.
