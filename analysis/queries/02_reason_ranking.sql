-- Question: Which stuck reasons should we fix first? (ranked by items × median wait)
-- SQLite has no MEDIAN(), so it is computed with window functions over each reason.
WITH stuck AS (
    SELECT tr.cause_id, t.amount_usd, t.age_hours, tr.past_sla
    FROM triage tr
    JOIN transfers t USING (transfer_id)
    WHERE tr.cause_id <> 'ON_TRACK'
),
ranked AS (
    SELECT cause_id, age_hours,
           ROW_NUMBER() OVER (PARTITION BY cause_id ORDER BY age_hours) AS rn,
           COUNT(*)     OVER (PARTITION BY cause_id)                    AS n
    FROM stuck
),
medians AS (
    SELECT cause_id, AVG(age_hours) AS median_age_hours
    FROM ranked
    WHERE rn IN ((n + 1) / 2, (n + 2) / 2)   -- middle row, or the two middle rows when n is even
    GROUP BY cause_id
)
SELECT
    c.label                                  AS reason,
    c.owner,
    COUNT(*)                                 AS items,
    ROUND(SUM(s.amount_usd), 0)              AS usd_stuck,
    ROUND(m.median_age_hours, 1)             AS median_age_h,
    ROUND(100.0 * AVG(s.past_sla), 0)        AS pct_past_sla,
    ROUND(COUNT(*) * m.median_age_hours, 0)  AS priority_score
FROM stuck s
JOIN medians m USING (cause_id)
JOIN causes  c USING (cause_id)
GROUP BY s.cause_id
ORDER BY priority_score DESC;
