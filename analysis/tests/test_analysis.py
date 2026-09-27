"""
The SQL layer is checked three ways:
  1. Data integrity: the export respects the schema's keys and constraints.
  2. Independent re-derivation: SQL rules written from the raw source tables must
     agree with the TypeScript classifier's output.
  3. Cross-checks: every SQL aggregate is recomputed in pandas and compared.
"""
import sqlite3

import pandas as pd
import pytest

import pipeline


def test_every_transfer_has_one_record_per_source_system(frames):
    ids = set(frames["transfers"].transfer_id)
    assert len(ids) == 362
    assert set(frames["partner_events"].transfer_id) == ids
    assert set(frames["ledger_entries"].transfer_id) == ids
    assert set(frames["triage"].transfer_id) == ids
    assert set(frames["compliance_reviews"].transfer_id) <= ids


def test_schema_rejects_bad_rows(con):
    with pytest.raises(sqlite3.IntegrityError):
        con.execute("INSERT INTO ledger_entries VALUES ('TX-NOPE', 'none')")  # unknown transfer
    with pytest.raises(sqlite3.IntegrityError):
        con.execute("UPDATE partner_events SET partner_status = 'lost' WHERE transfer_id = 'TX-10000'")
    con.rollback()


def test_sql_reconciliation_matches_the_app_classifier(con, frames):
    """Query 05 finds 'arrived, not posted' with joins only; it must equal the rules engine's DESYNC set."""
    sql_ids = set(pipeline.run(con, "05").transfer_id)
    engine_ids = set(frames["triage"].query("cause_id == 'DESYNC'").transfer_id)
    assert sql_ids == engine_ids
    assert len(sql_ids) == 19


def test_silent_holds_match_the_app_classifier(con, frames):
    silent = frames["compliance_reviews"].query("customer_notified == 0").transfer_id
    engine = frames["triage"].query("cause_id == 'HOLD_SILENT'").transfer_id
    assert set(silent) == set(engine)
    assert pipeline.run(con, "06").holds.sum() == len(silent)


def test_kpis_match_pandas(con, frames):
    k = pipeline.run(con, "01").iloc[0]
    df = frames["transfers"].merge(frames["triage"], on="transfer_id")
    stuck = df[df.cause_id != "ON_TRACK"]
    assert k.open_transfers == len(df) == 362
    assert k.stuck == len(stuck) == 221
    assert k.stuck_usd == round(stuck.amount_usd.sum()) == 191_638
    assert k.pct_stuck_never_told == round(100 * (stuck.customer_told == 0).mean(), 1)


def test_sql_median_matches_pandas_median(con, frames):
    ranking = pipeline.run(con, "02").set_index("reason")
    df = (
        frames["transfers"].merge(frames["triage"], on="transfer_id").merge(frames["causes"], on="cause_id")
    )
    expected = df[df.cause_id != "ON_TRACK"].groupby("label").age_hours.median().round(1)
    pd.testing.assert_series_equal(
        ranking.median_age_h.sort_index(), expected.sort_index(), check_names=False
    )


def test_ranking_is_sorted_and_excludes_on_track(con):
    r = pipeline.run(con, "02")
    assert "On its way, within SLA" not in set(r.reason)
    assert r.priority_score.is_monotonic_decreasing


def test_owner_workload_covers_every_stuck_item(con):
    assert pipeline.run(con, "03")["items"].sum() == 221


def test_sla_breach_rates_are_consistent(con, frames):
    rail = pipeline.run(con, "04")
    assert rail.past_sla.sum() == frames["triage"].past_sla.sum()
    assert rail.breach_rate_pct.between(0, 100).all()


def test_every_query_has_a_question_and_runs(con):
    for q in pipeline.load_queries():
        assert q.question, q.key
        pd.read_sql_query(q.sql, con)
