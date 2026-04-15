"""
Tests for DomainCorrector — runnable without faster-whisper installed.

    cd dictation-server
    python -m pytest tests/  -v
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from main import DomainCorrector


def test_exact_replacement_en():
    c = DomainCorrector()
    text, corrections = c.correct("there is a lesion in the hippo campus", "en")
    assert "hippocampus" in text
    assert "hippo campus" not in text
    assert any(corr["from"] == "hippo campus" for corr in corrections)


def test_number_pattern_en():
    c = DomainCorrector()
    text, _ = c.correct("the lesion measures three centimeter", "en")
    assert "3 cm" in text


def test_abbreviation_en():
    c = DomainCorrector()
    text, _ = c.correct("the patient received intravenous contrast", "en")
    assert "IV" in text


def test_fuzzy_match_en():
    c = DomainCorrector()
    # 'parenchyma' is canonical; 'parenchime' should fuzzy-match
    text, corrections = c.correct("liver parenchime appears normal", "en")
    assert "parenchyma" in text
    assert any("fuzzy" in corr["type"] for corr in corrections)


def test_no_dictionary_passthrough():
    c = DomainCorrector()
    text, corrections = c.correct("no changes here", "xx")
    assert text == "no changes here"
    assert corrections == []


def test_empty_input():
    c = DomainCorrector()
    text, corrections = c.correct("", "en")
    assert text == ""
    assert corrections == []


def test_short_words_not_fuzzy_matched():
    c = DomainCorrector()
    # 'cat' is too short to be fuzzy-matched against any canonical term
    text, _ = c.correct("a cat is not a tumor", "en")
    assert "cat" in text
