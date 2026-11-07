# Requirements Analysis Questions

The PRD leaves four team decisions open (how need is measured, how short-dated stock is prioritized, how missed pickups are treated, and how nutrition is weighed against quantity). Q1 to Q4 settle them. Q5 settles how data gets into the first version.

## Q1. [Product owner] How should a partner's need be measured?

Need drives each partner's fair share, which you defined as the fairness measure in intent capture.

- A. Households served only
- B. Households served, adjusted for recent growth in requests (for example, the rural pantry with growing need)
- C. Households served, adjusted for growth and for how much food the partner can store
- D. Not yet defined
- X. Other (please specify)

[Answer]: A

## Q2. [Product owner] How should short-dated stock be prioritized?

Stock that expires before it can be distributed is the spoilage you want to reduce.

- A. Allocate the soonest-to-expire stock first, to partners who can store and collect it in time
- B. Allocate the soonest-to-expire stock first, but only up to a partner's fair share
- C. Treat expiry as a flag only; the coordinator decides
- D. Not yet defined
- X. Other (please specify)

[Answer]: B

## Q3. [Product owner] How should a partner that missed last week's pickup be treated?

Allocated food that is never collected is wasted and unfair to other partners.

- A. Reduce its allocation this week by the amount it did not collect
- B. Keep its allocation but flag it, and let the coordinator decide
- C. Give it only items that keep well until it next collects
- D. Not yet defined
- X. Other (please specify)

[Answer]: B

## Q4. [Product owner] How should nutritional balance be weighed against quantity?

The PRD provides nutrition category targets. Quantity alone could send a partner only potatoes.

- A. Quantity and need come first; nutrition is shown as a check against the targets
- B. Nutrition targets are met first, then remaining quantity is shared by need
- C. Both are weighted equally in the suggested allocation
- D. Not yet defined
- X. Other (please specify)

[Answer]: A

## Q5. [Product owner] How should the coordinator load inventory and partner data?

The first version works with synthetic data only, and must let the coordinator load it.

- A. Upload spreadsheet-style files (CSV)
- B. Load a built-in set of synthetic data when the app starts
- C. Both: built-in sample data plus CSV upload
- D. Not yet defined
- X. Other (please specify)

[Answer]: B

## Q6. [Product owner] How is a weekly result compared with the three-month baselines?

Both success measures are judged on each weekly allocation (intent capture), but the baselines cover three months. This sets the pass or fail rule.

- A. Each weekly figure against the baseline's weekly average
- B. A rolling four-week average against the baseline's weekly average
- C. The full three months of synthetic history replayed with the suggested plans, against the baseline
- D. Not yet defined
- X. Other (please specify)

[Answer]: A

## Q7. [Product owner] What overall fairness result counts as a pass?

A partner is unfair when it is more than 20 percent above or below its fair share (Q10 of intent capture). This asks how many partners may be unfair in a passing week.

- A. No partner outside the 20 percent band
- B. At least 90 percent of partners inside the band
- C. At least 80 percent of partners inside the band
- D. Not yet defined
- X. Other (please specify)

[Answer]: A

## Q8. [Product owner] How is spoiled food scored for a suggested plan?

Spoilage happens after pickup, so a plan needs a rule that predicts it.

- A. Stock left unallocated, or allocated to a partner whose next pickup is after the stock expires, counts as spoiled
- B. Only stock left unallocated counts as spoiled
- C. Not yet defined
- X. Other (please specify)

[Answer]: A

## Q9. [Product owner] What is the base that a partner's fair share is taken from?

Fair share is a partner's share of total need (households served), but need can be applied to different amounts of food.

- A. Each item's stock on hand that week
- B. The total weight received that week
- C. The total weight partners requested that week
- D. Not yet defined
- X. Other (please specify)

[Answer]: A

## Q10. [Product owner] What happens to stock left over after every partner reaches its fair share?

Capping allocation at fair share could leave food in the warehouse to spoil.

- A. Keep allocating the surplus by need, and flag those allocations as above fair share
- B. Leave the surplus unallocated and flag it for the coordinator
- C. Offer the surplus only to partners who can store and collect it in time, flagged for the coordinator
- D. Not yet defined
- X. Other (please specify)

[Answer]: B

## Q11. [Product owner] How does a partner's pickup schedule change what it can be given?

The brief names pickup schedule as an allocation factor, but not how it works.

- A. A perishable item is allocated only if it expires after the partner's next pickup
- B. A perishable item is allocated only if it expires at least one day after the partner's next pickup
- C. Pickup timing is shown as a warning and the coordinator decides
- D. Not yet defined
- X. Other (please specify)

[Answer]: A

## Q12. [Product owner] How soon does stock count as "likely to expire before distribution"?

This sets when the expiry flag appears.

- A. Within 3 days of its expiry date and not yet allocated
- B. Within 7 days of its expiry date and not yet allocated
- C. Expiring before the earliest pickup of any partner that can store it, and not yet allocated
- D. Not yet defined
- X. Other (please specify)

[Answer]: A

## Q13. [Product owner] What is the loaded partner request data used for?

Requests are loaded with the data, but no requirement yet says what they do.

- A. Shown beside each suggestion for the coordinator, with no effect on quantities
- B. Used as an upper limit on what a partner is allocated
- C. Used to adjust a partner's need (for example, the rural pantry asking for more protein)
- D. Not used in the first version, so not loaded
- X. Other (please specify)

[Answer]: A

## Q14. [Product owner] Do you confirm the three behaviors added as assumptions?

These were added without being asked: (A2) when requests exceed stock, stock is shared in proportion to need; (A3) totals and storage checks update within 2 seconds after an adjustment; (A4) the same data and settings always give the same plan.

- A. Confirm all three
- B. Confirm some, change others (say which in Other)
- C. Not yet defined
- X. Other (please specify)

[Answer]: A

## Q15. [Product owner] How are data gaps handled in the first version?

Gaps: quantities in different units (for example cases and kilograms), donated items with no clear expiry date, and a partner with missing or zero households.

- A. The coordinator sets a conversion factor and expiry date in the app; items and partners still missing data are left out of the plan and flagged
- B. The built-in synthetic data is cleaned in advance, so the app needs no handling
- C. Not yet defined
- X. Other (please specify)

[Answer]: A

## Q16. [Product owner] What is a pass or fail for the nutrition check?

Nutrition is shown as a check against the nutrition category targets (Q4 above).

- A. Flag a category when a partner's allocated share is more than 10 percentage points below its target
- B. Show each category against its target, with no flag
- C. Not yet defined
- X. Other (please specify)

[Answer]: A

## Q17. [Product owner] Are partner pantries users of the first version?

The coordinator is the sole decision-maker. This asks whether partners also see or use the tool.

- A. No, the coordinator is the only user; partners are out of scope
- B. Yes, partners get a view of their own allocation
- C. Not yet defined
- X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

- Q1 need: households served only
- Q2 short-dated stock: soonest-to-expire first, but only up to a partner's fair share
- Q3 missed pickups: keep the allocation, flag the partner, coordinator decides
- Q4 nutrition: quantity and need first, nutrition shown as a check against targets
- Q5 data loading: built-in synthetic sample data loaded at start
- Q6 comparison: each weekly figure against the baseline's weekly average
- Q7 fairness pass: no partner outside the 20 percent band
- Q8 spoilage scoring: unallocated stock, or stock given to a partner whose next pickup is after expiry, counts as spoiled
- Q9 fair-share base: each item's stock on hand that week
- Q10 surplus: leave it unallocated and flag it for the coordinator
- Q11 pickup rule: a perishable is allocated only if it expires after the partner's next pickup
- Q12 expiry flag: within 3 days of expiry and not yet allocated
- Q13 request data: shown beside each suggestion, no effect on quantities
- Q14 assumptions: proportional sharing when requests exceed stock, 2-second updates, and repeatable plans are all confirmed
- Q15 data gaps: the coordinator sets conversion and expiry in the app; items and partners still missing data are left out and flagged
- Q16 nutrition check: flag a category when a partner's share is more than 10 percentage points below its target
- Q17 users: the coordinator only; partners are out of scope

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
