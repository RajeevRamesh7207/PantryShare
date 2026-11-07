# Requirements

Sources: `intent-statement.md` (Intent), the stage answers Q1 to Q17 in `requirements-analysis-questions.md` (Q), and the project brief `PantrySharePRD.html` (PRD).

## Intent Analysis

The distribution coordinator needs a weekly allocation that is fair, explainable and keeps waste low. Food spoils in the warehouse while some partner pantries run short. The first version succeeds if spoiled food drops at least 25 percent from its baseline and no partner's share of allocated food is more than 20 percent from its fair share, judged on each weekly allocation. (Intent, Q6, Q7)

## Functional Requirements

### FR1 Load and prepare data

- **FR1.1** The system shall load built-in synthetic inventory, partner, past allocation, request and nutrition target data when it starts. (Q5, PRD)
  - Given the app starts, When the coordinator opens it, Then inventory (item, category, quantity, expiry date) and 60 partners with households served, storage and pickup schedule are available without any upload.
- **FR1.2** The system shall let the coordinator set a conversion factor for an item recorded in different units. Items without a factor shall be left out of the plan and flagged. (Q15, PRD)
  - Given an item recorded in cases and in kilograms with no factor set, When the plan is built, Then the item is left out and flagged. Given a factor is set, Then both records combine into one total.
- **FR1.3** The system shall let the coordinator set the expiry date of a donated item with an unclear date. Items without a date shall be left out of the plan and flagged. (Q15, PRD)
- **FR1.4** The system shall leave out of the plan, and flag, any partner with missing or zero households served. (Q15)

### FR2 Allocation suggestions

- **FR2.1** The system shall suggest a quantity of each item for each partner, based on need, storage and pickup schedule. (PRD)
- **FR2.2** The system shall measure a partner's need as the households it serves. (Q1)
- **FR2.3** The system shall take a partner's fair share of an item as its share of total need applied to that item's stock on hand that week. It shall allocate the soonest-to-expire stock first, and only up to that fair share. (Q2, Q9)
  - Given 2 tonnes of yogurt expiring in 6 days and partners with refrigeration, When allocating, Then yogurt goes to those partners in proportion to need and no partner receives more than its fair share of it.
- **FR2.4** The system shall not allocate perishable items to a partner without suitable storage. (PRD)
  - Given a partner without refrigeration, When allocating dairy or frozen items, Then that partner receives none of them.
- **FR2.5** The system shall weigh quantity and need first and show nutrition as a check against the nutrition category targets. (Q4)
- **FR2.6** When total requests exceed available stock, the system shall share stock in proportion to need and show each partner's shortfall. (Q14, PRD)
- **FR2.7** Stock left over after every partner reaches its fair share shall stay unallocated and be flagged for the coordinator, who decides what to do with it. (Q10)
  - Given stock exceeds the total of all fair shares, When the plan is built, Then the surplus is shown as unallocated and flagged, and no partner receives more than its fair share.
- **FR2.8** The system shall allocate a perishable item to a partner only if the item expires after the partner's next pickup. (Q11)
  - Given yogurt expiring Wednesday and a partner whose next pickup is Thursday, When allocating, Then that partner receives no yogurt.

### FR3 Expiry and fairness checks

- **FR3.1** The system shall flag stock that is within 3 days of its expiry date and not yet allocated. (Q12)
- **FR3.2** The system shall define a partner's fair share as in FR2.3, and flag a partner whose share is more than 20 percent above or below it. (Intent, Q9)
  - Given a partner whose allocated share is 25 percent above its fair share, When the plan is shown, Then that partner is flagged. Given exactly 20 percent, Then it is not flagged.
- **FR3.3** The system shall flag a partner that missed last week's pickup and shall keep its allocation unchanged for the coordinator to decide. (Q3)
- **FR3.4** The system shall flag a nutrition category when a partner's allocated share is more than 10 percentage points below that category's target. (Q16)

### FR4 Explanations

- **FR4.1** The system shall show, for each partner and item, why that quantity was allocated, naming the need, storage, expiry and pickup factors used. (PRD)
- **FR4.2** The system shall show each partner's requests and notes beside its suggestions, with no effect on quantities. (Q13)

### FR5 Coordinator control

- **FR5.1** The system shall let the coordinator adjust any allocation and shall update totals and storage checks immediately. (PRD)
  - Given a coordinator raises a partner's dairy quantity above its storage, When the change is made, Then totals update and a storage warning shows.
- **FR5.2** The system shall leave final control of every allocation with the coordinator. (PRD, Intent)

### FR6 Success measures

- **FR6.1** The system shall report spoiled food as percent of received weight that expired before distribution. For a suggested plan, unallocated stock, and stock given to a partner whose next pickup is after the stock expires, count as spoiled. (Intent, Q8)
  - Pass: each weekly figure is at least 25 percent lower than the baseline's weekly average, which is calculated from the three months of synthetic history. (Intent, Q6)
- **FR6.2** The system shall report fairness as the partners outside 20 percent of their fair share. (Intent, Q7)
  - Pass: for each weekly allocation, no partner is outside the 20 percent band. The baseline is calculated from the three months of synthetic past allocations. (Intent, Q6, Q7)

## Non-Functional Requirements

- **NFR1** The system shall use synthetic inventory and partner data only, and shall hold no personal data about individual clients. (PRD)
- **NFR2** Every allocation line shall have an explanation (FR4.1); no suggested quantity appears without one. (PRD)
- **NFR3** After a coordinator adjustment, totals and storage checks shall update within 2 seconds for 60 partners. (Q14)
- **NFR4** The same data and settings shall always produce the same suggested plan. (Q14)

## Constraints

- The first version works with synthetic data only. (PRD)
- Perishable items must not go to partners without suitable storage. (PRD)
- The coordinator keeps final control of every allocation. (PRD)

## Assumptions

- **A1** Household figures in the synthetic data may be out of date, and are used as given for need. (PRD, Q1)
- **A2** The baseline's weekly average is the three-month total divided by the number of weeks in the synthetic history. This was not asked. (Intent, Q6)

## Out of Scope

Individual client tracking, volunteer management, fundraising, delivery route planning, a connection to the food bank's inventory system (Intent), and any partner-facing view of the tool. (Q17)

## Open Questions

None.
