# Analysis: Python + SQL

The business questions behind the triage console, answered with **SQL (SQLite)**, **pandas** and **matplotlib**, and tested with **pytest**.

**Start here:** [`report.ipynb`](report.ipynb) (renders on GitHub with every table and chart).

## How it's built

```
analysis/
├── data/          # normalized CSVs exported from the app's TypeScript model (npm run export:data)
├── schema.sql     # 7 tables with primary/foreign keys and CHECK constraints
├── queries/       # one business question per .sql file
├── pipeline.py    # loads CSVs into SQLite, runs queries, returns DataFrames
├── report.ipynb   # the analysis, with charts
├── figures/       # charts exported by the notebook
└── tests/         # pytest: SQL results cross-checked against pandas and the app's rules engine
```

The data model splits each transfer across the systems where its status actually lives: `transfers` (the app), `partner_events` (the payment partner), `ledger_entries` (the ledger) and `compliance_reviews` (compliance). The rules engine's output lands in `triage`. The analysis is mostly about joining those sources.

## Questions and findings

| # | Question | SQL techniques |
|---|---|---|
| 01 | How much money is stuck, and how often is the customer never told? | conditional aggregation |
| 02 | Which reasons should be fixed first? | CTEs, `ROW_NUMBER()` / `COUNT() OVER` to compute a median |
| 03 | Which team owns the next move? | `GROUP BY`, `GROUP_CONCAT` |
| 04 | Which rails breach SLA most often? | ratio metrics across joined dimensions |
| 05 | Which deposits settled but never posted? | 4-way join + anti-join (`LEFT JOIN … IS NULL`) reconciliation |
| 06 | How long have silent holds been waiting? | `CASE` bucketing |
| 07 | Which countries carry the most stuck money? | window ranking to pick the top reason per group |

**Snapshot:** 362 open transfers · 221 stuck · $191,638 held · **76% of stuck items were never explained to the customer.**

**Priority ranking (query 02):**

| reason                             | owner       |   items |   usd_stuck |   median_age_h |   priority_score |
|:-----------------------------------|:------------|--------:|------------:|---------------:|-----------------:|
| Under review, customer not told    | Compliance  |      41 |    26,856.0 |          123.3 |          5,055.0 |
| Sent into a rail under maintenance | Ops         |      31 |    32,239.0 |          108.1 |          3,351.0 |
| Waiting on customer document       | Customer    |      29 |    19,770.0 |          110.2 |          3,196.0 |
| Arrived, can't match to a customer | Ops         |      26 |    35,555.0 |          122.0 |          3,173.0 |
| Returned by bank                   | Customer    |      24 |    19,231.0 |           75.8 |          1,820.0 |
| At partner, past SLA               | Ops         |      34 |    26,095.0 |           45.6 |          1,552.0 |
| Arrived, not posted                | Engineering |      19 |    23,609.0 |           60.2 |          1,144.0 |
| Crypto sent on the wrong network   | Engineering |      11 |     4,830.0 |           63.1 |            694.0 |
| No rule matched                    | Investigate |       6 |     3,453.0 |           11.5 |             69.0 |

![Reason ranking](figures/reason_ranking.png)

**SLA breach rate by rail (query 04):**

| rail        |   sla_hours |   breach_rate_pct |
|:------------|------------:|------------------:|
| Cash pickup |          24 |              67.9 |
| US wire in  |          24 |              63.5 |
| Crypto in   |           1 |              62.8 |
| MXN SPEI in |           1 |              55.1 |
| Bank payout |          48 |              53.7 |
| EUR SEPA in |          24 |              50.8 |
| US ACH in   |          72 |              25.5 |

**Reconciliation (query 05):** 19 deposits ($23,609) settled at the partner with a matching reference but have no ledger credit. The query finds them from the raw source tables alone, and a test asserts the result matches the app's rules engine exactly.

## Tests

```bash
pip install -r analysis/requirements.txt
python analysis/pipeline.py        # print every query result
python analysis/pipeline.py 05     # just one
pytest analysis -v
```

The tests cover:

- **integrity:** each transfer has one row per source system, and the schema rejects unknown IDs or invalid statuses
- **independent re-derivation:** the SQL reconciliation (05) and silent-hold logic return the same transfers as the TypeScript classifier
- **cross-checks:** the KPIs and the window-function median are recomputed in pandas and must match
