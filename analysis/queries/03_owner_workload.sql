-- Question: Which team owns the next move on stuck money, and how much of it is past SLA?
SELECT
    c.owner,
    COUNT(*)                                   AS items,
    ROUND(SUM(t.amount_usd), 0)                AS usd,
    SUM(tr.past_sla)                           AS past_sla,
    GROUP_CONCAT(DISTINCT c.label)             AS reasons
FROM triage tr
JOIN transfers t USING (transfer_id)
JOIN causes    c USING (cause_id)
WHERE tr.cause_id <> 'ON_TRACK'
GROUP BY c.owner
ORDER BY usd DESC;
