from boluo.analytics import network_report, scenario, survey_report, summary
from boluo.demo import BASE_2025, DEMO_ID, fingerprint, generate
import math

def test_demo_deterministic_and_linked():
    a,b=generate(),generate()
    assert a.dataset_id==DEMO_ID
    assert fingerprint(a)==fingerprint(b)
    assert len(a.tables["enterprises"])==500
    assert len(a.tables["survey"])==300
    assert len(a.tables["workers"])==250
    assert len(a.tables["relations"])>600
    ids={e["enterprise_id"] for e in a.tables["enterprises"]}
    assert all(r["source_id"] in ids and r["target_id"] in ids for r in a.tables["relations"])
    assert all(r["enterprise_id"] in ids for r in a.tables["survey"])
    assert sum(BASE_2025.values())==1005.45

def test_baseline_and_scenarios_not_hardcoded():
    b=generate()
    x=scenario(b, "balanced", draws=350, seed=100)
    y=scenario(b, "industrial", draws=350, seed=100)
    assert x==scenario(b, "balanced", draws=350, seed=100)
    assert x["sectors_2032"]["secondary"]["p50"]<y["sectors_2032"]["secondary"]["p50"]
    assert x["base"]["gdp"]==1005.45
    assert abs(sum(x["share_2032_p50"].values())-1)<.01
    assert x["total_2032"]["p10"]<x["total_2032"]["p50"]<x["total_2032"]["p90"]
    assert x["within_one_percentage_point"]>=0 and x["within_one_percentage_point"]<=1

def test_knobs_change_results():
    b=generate()
    a=scenario(b, "balanced", draws=300, seed=200)
    c=scenario(b, "balanced", knobs={"services":1}, draws=300, seed=200)
    assert c["sectors_2032"]["tertiary"]["p50"]>a["sectors_2032"]["tertiary"]["p50"]

def test_network_computes_synthetic_edges():
    b=generate()
    result=network_report(b)
    assert result["node_count"]==500
    assert result["edge_count"]>500
    assert result["missing_endpoint_count"]==0
    assert sum(result["service_demand_million"].values())>0

def test_exploratory_path_model_real_estimation():
    result=survey_report(generate(), bootstraps=30, seed=123)
    assert result["n"]==300
    assert result["paths"]["SA->SU"]>0.10
    assert result["paths"]["SU->OP"]>0.10
    assert set(result["confidence_intervals"])==set(result["paths"])
    assert result["measurement"]["SA"]["cronbach_alpha"]>0.4
    assert "SmartPLS" in result["warning"]
