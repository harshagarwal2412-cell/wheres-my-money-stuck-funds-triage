-- Question: Which rails breach their SLA most often?
SELECT
    r.label                                          AS rail,
    r.sla_hours,
    COUNT(*)                                         AS open_items,
    SUM(tr.past_sla)                                 AS past_sla,
    ROUND(100.0 * SUM(tr.past_sla) / COUNT(*), 1)    AS breach_rate_pct,
    ROUND(AVG(t.age_hours / r.sla_hours), 2)         AS avg_age_vs_sla
FROM transfers t
JOIN rails  r  USING (rail_id)
JOIN triage tr USING (transfer_id)
GROUP BY r.rail_id
ORDER BY breach_rate_pct DESC;
