-- Question: Which countries carry the most stuck money, and what is the top reason in each?
WITH by_country_reason AS (
    SELECT t.country, c.label AS reason, COUNT(*) AS n, SUM(t.amount_usd) AS usd
    FROM triage tr
    JOIN transfers t USING (transfer_id)
    JOIN causes    c USING (cause_id)
    WHERE tr.cause_id <> 'ON_TRACK'
    GROUP BY t.country, c.label
),
top_reason AS (
    SELECT country, reason,
           ROW_NUMBER() OVER (PARTITION BY country ORDER BY n DESC, usd DESC) AS rk
    FROM by_country_reason
)
SELECT
    b.country,
    SUM(b.n)                  AS stuck_items,
    ROUND(SUM(b.usd), 0)      AS stuck_usd,
    tr.reason                 AS top_reason
FROM by_country_reason b
JOIN top_reason tr ON tr.country = b.country AND tr.rk = 1
GROUP BY b.country
ORDER BY stuck_usd DESC;
