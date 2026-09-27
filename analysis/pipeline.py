"""
Build a SQLite database from the exported CSVs and run the analysis queries.

    python analysis/pipeline.py            # build the DB and print every query result
    python analysis/pipeline.py 03         # run just the query whose file starts with 03

Layout:
    analysis/schema.sql      table definitions (types, keys, constraints)
    analysis/data/*.csv      one CSV per table, exported from the app's domain model
    analysis/queries/*.sql   one business question per file; the first comment line is the question
"""
from __future__ import annotations

import csv
import sqlite3
import sys
from dataclasses import dataclass
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
QUERIES = ROOT / "queries"
SCHEMA = ROOT / "schema.sql"


@dataclass(frozen=True)
class Query:
    key: str  # e.g. "03_owner_workload"
    question: str
    sql: str


def connect(path: str | Path = ":memory:") -> sqlite3.Connection:
    """Create the schema and load every CSV into its table. Empty CSV cells become NULL."""
    con = sqlite3.connect(path)
    con.execute("PRAGMA foreign_keys = ON")
    con.executescript(SCHEMA.read_text())
    tables = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type = 'table'")]
    # Load parents before children so foreign keys are satisfied.
    for table in _load_order(con, tables):
        path = DATA / f"{table}.csv"
        if not path.exists():
            continue
        with path.open(newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            cols = reader.fieldnames or []
            rows = [[(v if v != "" else None) for v in (r[c] for c in cols)] for r in reader]
        placeholders = ", ".join("?" for _ in cols)
        con.executemany(f"INSERT INTO {table} ({', '.join(cols)}) VALUES ({placeholders})", rows)
    con.commit()
    return con


def _load_order(con: sqlite3.Connection, tables: list[str]) -> list[str]:
    deps = {t: {r[2] for r in con.execute(f"PRAGMA foreign_key_list({t})")} - {t} for t in tables}
    ordered: list[str] = []
    while deps:
        ready = sorted(t for t, d in deps.items() if not d - set(ordered))
        if not ready:
            raise RuntimeError(f"circular foreign keys: {deps}")
        ordered += ready
        for t in ready:
            del deps[t]
    return ordered


def load_queries() -> list[Query]:
    out = []
    for path in sorted(QUERIES.glob("*.sql")):
        sql = path.read_text()
        first = next((l for l in sql.splitlines() if l.startswith("--")), "-- ")
        out.append(Query(path.stem, first.lstrip("- ").removeprefix("Question:").strip(), sql))
    return out


def run(con: sqlite3.Connection, key: str) -> pd.DataFrame:
    """Run the query whose file name starts with `key` (e.g. "03" or "03_owner_workload")."""
    matches = [q for q in load_queries() if q.key.startswith(key)]
    if len(matches) != 1:
        raise KeyError(f"expected one query matching {key!r}, found {[q.key for q in matches]}")
    return pd.read_sql_query(matches[0].sql, con)


def main(argv: list[str]) -> None:
    con = connect()
    pd.set_option("display.width", 160, "display.max_columns", 20, "display.max_colwidth", 60)
    for q in load_queries():
        if argv and not q.key.startswith(argv[0]):
            continue
        print(f"\n=== {q.key} ===\n{q.question}\n")
        print(pd.read_sql_query(q.sql, con).to_string(index=False))


if __name__ == "__main__":
    main(sys.argv[1:])
