import sys
from pathlib import Path

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import pipeline  # noqa: E402


@pytest.fixture(scope="session")
def con():
    c = pipeline.connect()
    yield c
    c.close()


@pytest.fixture(scope="session")
def frames(con):
    """Every table as a DataFrame, for independent pandas cross-checks."""
    names = [r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type = 'table'")]
    return {n: pd.read_sql_query(f"SELECT * FROM {n}", con) for n in names}
