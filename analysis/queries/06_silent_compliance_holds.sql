-- Question: How long have customers been waiting on a compliance review nobody told them about?
SELECT
    CASE
        WHEN t.age_hours - cr.opened_at_hours < 24  THEN '1: under 1 day'
        WHEN t.age_hours - cr.opened_at_hours < 72  THEN '2: 1-3 days'
        WHEN t.age_hours - cr.opened_at_hours < 168 THEN '3: 3-7 days'
        ELSE                                             '4: over 7 days'
    END                               AS waiting,
    COUNT(*)                          AS holds,
    ROUND(SUM(t.amount_usd), 0)       AS usd_held
FROM compliance_reviews cr
JOIN transfers t USING (transfer_id)
WHERE cr.customer_notified = 0
GROUP BY waiting
ORDER BY waiting;
