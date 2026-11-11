import base64
import io
import json
import zipfile
import pytest
from fastapi.testclient import TestClient
import boluo.app as service
from boluo.demo import DEMO_ID, fingerprint

@pytest.fixture()
def client(tmp_path, monkeypatch):
    from boluo.store import DatasetStore
    monkeypatch.setattr(service, "store", DatasetStore(tmp_path))
    monkeypatch.setattr(service, "TOKEN", "")
    return TestClient(service.app)

def test_home_health_and_scenario(client):
    page=client.get("/")
    assert page.status_code==200 and "内部研究工作台" in page.text
    assert client.get("/static/app.js").status_code==200
    assert client.get("/api/v1/health").json()["private_development_only"]
    r=client.post("/api/v1/scenarios/run",json={"dataset_id":DEMO_ID,"draws":300})
    assert r.status_code==200,r.text
    assert r.json()["mode"]=="DEMO"
    assert r.json()["total_2032"]["p90"]>r.json()["total_2032"]["p10"]

def test_macro_import_creates_new_immutable_snapshot(client):
    csv_data="year,primary,secondary,tertiary\n2025,120,650,380\n"
    r=client.post("/api/v1/datasets/import",json={"dataset_id":DEMO_ID,"table":"macro",
        "filename":"macro.csv","file_base64":base64.b64encode(csv_data.encode()).decode()})
    assert r.status_code==200,r.text
    snap=r.json()["dataset"]["dataset_id"]
    assert snap.startswith("SNAP-")
    assert r.json()["dataset"]["mode"]=="MIXED"
    a=client.get("/api/v1/overview?dataset_id="+snap).json()
    assert a["summary"]["baseline"]["gdp"]==1150
    assert client.get("/api/v1/overview?dataset_id="+DEMO_ID).json()["summary"]["baseline"]["gdp"]==1005.45
    result=client.post("/api/v1/scenarios/run",json={"dataset_id":snap,"draws":300})
    assert result.status_code==200 and result.json()["base"]["gdp"]==1150

def test_bad_macro_does_not_silently_fill_missing_values(client):
    csv_data="year,primary,secondary,tertiary\n2025,120,,380\n"
    r=client.post("/api/v1/datasets/import",json={"dataset_id":DEMO_ID,"table":"macro",
        "filename":"macro.csv","file_base64":base64.b64encode(csv_data.encode()).decode()})
    assert r.status_code==422

def test_external_package_and_results(client):
    r=client.post("/api/v1/external-packages",json={"dataset_id":DEMO_ID})
    assert r.status_code==200
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        assert "data/survey.csv" in z.namelist()
        manifest=json.loads(z.read("manifest.json"))
        assert manifest["mode"]=="DEMO"
        template=json.loads(z.read("model/external_result_template.json"))
    assert client.post("/api/v1/external-results",json=template).status_code==422
    template["software_version"]="4.0-analyzed"
    template["paths"]={"SA->SU":0.43,"SA->OP":0.23,"SU->OP":0.35}
    result=client.post("/api/v1/external-results",json=template)
    assert result.status_code==200,result.text
    comp=client.get("/api/v1/comparisons/"+result.json()["external_result_id"])
    assert comp.status_code==200 and comp.json()["comparison_status"].startswith("EXPLORATORY")
    template["dataset_fingerprint"]="invalid"
    assert client.post("/api/v1/external-results",json=template).status_code==422

def test_token_protection(client,monkeypatch):
    monkeypatch.setattr(service,"TOKEN","long-test-token")
    assert client.get("/api/v1/overview").status_code==401
    assert client.get("/api/v1/overview",headers={"X-Internal-Token":"long-test-token"}).status_code==200
