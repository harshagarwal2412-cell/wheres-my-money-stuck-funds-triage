-- Question: Which deposits settled at the partner but never reached the customer's balance?
-- Re-derives the "arrived, not posted" rule straight from the source systems with joins,
-- independent of the app's classifier. Tests assert both give the same answer.
SELECT
    t.transfer_id,
    t.customer_id,
    r.label                                          AS rail,
    t.amount_usd,
    ROUND(t.age_hours - p.settled_at_hours, 1)       AS hours_since_settled
FROM transfers t
JOIN rails              r  USING (rail_id)
JOIN partner_events     p  USING (transfer_id)
JOIN ledger_entries     l  USING (transfer_id)
LEFT JOIN compliance_reviews cr USING (transfer_id)
WHERE p.partner_status = 'settled'
  AND p.ref_matched = 1
  AND l.ledger_status = 'none'
  AND cr.transfer_id IS NULL          -- an open review would explain the missing credit
  AND COALESCE(p.return_code, '') = ''
ORDER BY hours_since_settled DESC;
