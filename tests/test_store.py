import csv
import io
from pathlib import Path
import pytest
from boluo.demo import DEMO_ID, fingerprint
from boluo.store import DatasetStore, parse_upload, validate_rows

def test_private_store_and_versioning(tmp_path):
    s=DatasetStore(tmp_path)
    csv_rows=parse_upload("test.csv",b"year,primary,secondary,tertiary\n2025,110,500,400\n")
    x=s.update_table(DEMO_ID,"macro",csv_rows)
    assert x.mode=="MIXED"
    assert s.get(x.dataset_id).tables["macro"][0]["primary"]==110
    assert s.get(DEMO_ID).tables["macro"][-1]["primary"]==107.44
    assert (tmp_path/"snapshots"/(x.dataset_id+".json")).exists()
    assert fingerprint(s.get(x.dataset_id))==fingerprint(x)

def test_missing_survey_indicator_rejected():
    with pytest.raises(ValueError,match="缺少必需字段"):
        validate_rows("survey",[{"respondent_id":"R1","SA1":1}])

def test_invalid_file_and_macro_rejected():
    with pytest.raises(ValueError):
        parse_upload("bad.pdf",b"hello")
    with pytest.raises(ValueError):
        validate_rows("macro",[{"year":2023,"primary":1,"secondary":2,"tertiary":3}])
