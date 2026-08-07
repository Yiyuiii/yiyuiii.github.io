from pathlib import Path

import pytest

from scripts.audit_toy_experience import run_audit


ROOT = Path(__file__).resolve().parents[1]


def test_audit_output_must_stay_outside_the_repository():
    with pytest.raises(ValueError, match="outside the repository"):
        run_audit(ROOT / "_site", ROOT / "test-results" / "toy-audit")
