-- Question: How much money is stuck right now, and how often is the customer left in the dark?
-- "Stuck" = anything the classifier did not mark ON_TRACK.
SELECT
    COUNT(*)                                                        AS open_transfers,
    SUM(tr.cause_id <> 'ON_TRACK')                                  AS stuck,
    ROUND(SUM(CASE WHEN tr.cause_id <> 'ON_TRACK' THEN t.amount_usd END), 0) AS stuck_usd,
    ROUND(100.0 * SUM(tr.cause_id <> 'ON_TRACK' AND t.customer_told = 0)
                / SUM(tr.cause_id <> 'ON_TRACK'), 1)                AS pct_stuck_never_told,
    ROUND(100.0 * SUM(tr.past_sla) / COUNT(*), 1)                   AS pct_past_sla
FROM transfers t
JOIN triage tr USING (transfer_id);
