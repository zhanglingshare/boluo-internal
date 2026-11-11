"""Build a self-contained, synthetic-only research pack from the same API as the UI.

Run: python -m tools.export_demo
Writes to ignored artifacts/demo/. No external data, no network access.
"""
from __future__ import annotations

import json
import zipfile
from io import BytesIO
from pathlib import Path

from fastapi.testclient import TestClient
from boluo.app import app
from boluo.demo import DEMO_ID

ROOT = Path(__file__).resolve().parents[1]

def main() -> None:
    out = ROOT / "artifacts" / "demo"
    out.mkdir(parents=True, exist_ok=True)
    client = TestClient(app)
    req = {"dataset_id": DEMO_ID}
    package = client.post("/api/v1/external-packages", json=req)
    package.raise_for_status()
    scenarios = {}
    for scenario_id in ("balanced", "industrial", "agriculture", "service", "stress"):
        response = client.post("/api/v1/scenarios/run", json={
            **req, "scenario_id": scenario_id, "draws": 2500, "seed": 2032})
        response.raise_for_status()
        scenarios[scenario_id] = response.json()
    model = client.post("/api/v1/models/run", json={
        **req, "bootstraps": 100, "seed": 317})
    model.raise_for_status()
    network = client.get("/api/v1/network", params=req)
    network.raise_for_status()
    report = client.post("/api/v1/reports", json={
        **req, "scenario_id": "balanced"})
    report.raise_for_status()
    target = out / "BOLUO_2032_DEMO_V1_research_pack.zip"
    with zipfile.ZipFile(target, "w", compression=zipfile.ZIP_DEFLATED) as z:
        with zipfile.ZipFile(BytesIO(package.content)) as base:
            for item in base.infolist():
                z.writestr(item.filename, base.read(item.filename))
        z.writestr("computed/scenarios.json", json.dumps(scenarios, ensure_ascii=False, indent=2))
        z.writestr("computed/network.json", json.dumps(network.json(), ensure_ascii=False, indent=2))
        z.writestr("computed/program_pls_experimental.json",
                   json.dumps(model.json(), ensure_ascii=False, indent=2))
        z.writestr("computed/research_report_demo.md", report.content)
        z.writestr("computed/IMPORTANT.txt",
                   "All 500 enterprises, 300 enterprise surveys, 250 worker records, "
                   "projects and edges are synthetic. Scenario results are conditional. "
                   "Do not cite as observed Boluo statistics or policy effects. "
                   "SmartPLS real software results are NOT bundled or fabricated.\n")
    assert target.stat().st_size > 1000
    print(f"Demo research pack generated: {target.name} ({target.stat().st_size} bytes)")

if __name__ == "__main__":
    main()
