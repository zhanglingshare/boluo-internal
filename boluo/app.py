"""Loopback-only research API. Never publish this dev server to the Internet."""
from __future__ import annotations

import base64
import csv
import hashlib
import io
import json
import os
import hmac
import zipfile
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field, ConfigDict

from . import __version__
from .analytics import BLOCKS, SCENARIOS, network_report, scenario, summary, survey_report
from .demo import DEMO_ID, csv_string, fingerprint, manifest
from .store import DatasetStore, parse_upload

ROOT = Path(__file__).resolve().parents[1]
app = FastAPI(title="博罗决策模拟器 · 内部版", version=__version__,
              docs_url=None, redoc_url=None, openapi_url=None)
store = DatasetStore()
TOKEN = os.environ.get("BOLUO_INTERNAL_TOKEN", "")

@app.middleware("http")
async def internal_access(request: Request, call_next):
    if TOKEN and not hmac.compare_digest(request.headers.get("X-Internal-Token", ""), TOKEN):
        # The static shell may load; all data and APIs remain protected by the token.
        if request.url.path.startswith("/api/"):
            return Response("Unauthorized", status_code=401)
    return await call_next(request)

def load_bundle(dataset_id: str):
    try:
        return store.get(dataset_id)
    except KeyError as exc:
        raise HTTPException(404, str(exc)) from exc

class ScenarioRequest(BaseModel):
    dataset_id: str = DEMO_ID
    scenario_id: str = "balanced"
    knobs: dict[str, float] = Field(default_factory=dict)
    draws: int = Field(default=2500, ge=300, le=10000)
    seed: int = Field(default=2032, ge=0, lt=2**32)

class ModelRequest(BaseModel):
    dataset_id: str = DEMO_ID
    bootstraps: int = Field(default=100, ge=30, le=1500)
    seed: int = 317

class ImportRequest(BaseModel):
    dataset_id: str = DEMO_ID
    table: str
    filename: str
    file_base64: str = Field(max_length=4_100_000)

class DatasetRequest(BaseModel):
    dataset_id: str = DEMO_ID

class ExternalResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    dataset_id: str
    dataset_fingerprint: str
    model_id: str
    software: str
    software_version: str
    n: int = Field(ge=1)
    paths: dict[str, float]
    ci: dict[str, list[float]] = Field(default_factory=dict)
    notes: str = ""

class ReportRequest(BaseModel):
    dataset_id: str = DEMO_ID
    scenario_id: str = "balanced"

@app.get("/")
def index():
    return FileResponse(ROOT / "web" / "index.html")

@app.get("/api/v1/health")
def health():
    return {"ok": True, "edition": "INTERNAL", "version": __version__,
            "default_dataset": DEMO_ID, "private_development_only": True}

@app.get("/api/v1/datasets")
def datasets():
    return {"default": DEMO_ID, "snapshots": [manifest(b) for b in store._bundles.values()],
            "note": "Imported snapshots are kept only under the local private data directory."}

@app.get("/api/v1/overview")
def overview(dataset_id: str = DEMO_ID):
    b = load_bundle(dataset_id)
    return {"dataset": manifest(b), "summary": summary(b), "scenarios": SCENARIOS}

@app.get("/api/v1/network")
def network(dataset_id: str = DEMO_ID):
    return network_report(load_bundle(dataset_id))

@app.post("/api/v1/models/run")
def model_run(req: ModelRequest):
    b = load_bundle(req.dataset_id)
    try:
        result = survey_report(b, bootstraps=req.bootstraps, seed=req.seed)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    result["data_fingerprint"] = fingerprint(b)
    result["run_id"] = "PLS-" + hashlib.sha256(json.dumps(
        {"data": result["data_fingerprint"], "boots": req.bootstraps,
         "seed": req.seed, "model_id": result["model_id"]}, sort_keys=True).encode()).hexdigest()[:16]
    store.record(result)
    return result

@app.post("/api/v1/scenarios/run")
def scenario_run(req: ScenarioRequest):
    try:
        result = scenario(load_bundle(req.dataset_id), req.scenario_id, req.knobs, req.draws, req.seed)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    store.record(result)
    return result

@app.post("/api/v1/datasets/import")
def import_dataset(req: ImportRequest):
    try:
        raw = base64.b64decode(req.file_base64, validate=True)
        rows = parse_upload(req.filename, raw)
        result = store.update_table(req.dataset_id, req.table, rows)
    except (ValueError, KeyError) as exc:
        raise HTTPException(422, str(exc)) from exc
    return {"dataset": manifest(result), "recompute_required": True,
            "warning": "IMPORTED_UNVERIFIED：未经核验的输入不可作为经证实的官方数据。"}

@app.post("/api/v1/external-packages")
def external_package(req: DatasetRequest):
    bundle = load_bundle(req.dataset_id)
    memory = io.BytesIO()
    with zipfile.ZipFile(memory, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for name, rows in bundle.tables.items():
            z.writestr("data/" + name + ".csv", csv_string(rows))
        z.writestr("manifest.json", json.dumps(manifest(bundle), ensure_ascii=False, indent=2))
        z.writestr("model/variables.json", json.dumps(BLOCKS, ensure_ascii=False, indent=2))
        z.writestr("model/paths.json", json.dumps({"SU": ["SA"], "OP": ["SA", "SU"]}, indent=2))
        z.writestr("model/external_result_template.json", json.dumps({
            "dataset_id": bundle.dataset_id, "dataset_fingerprint": fingerprint(bundle),
            "model_id": "service_access_mode_a_experimental_v1", "software": "SmartPLS",
            "software_version": "FILL_ME", "n": len(bundle.tables["survey"]),
            "paths": {"SA->SU": 0, "SA->OP": 0, "SU->OP": 0}, "ci": {},
            "notes": "REPLACE ALL PLACEHOLDERS WITH ACTUAL SOFTWARE RESULTS"}, indent=2))
        z.writestr("READ_ME_FIRST.txt", (
            "BOLUO INTERNAL / DEMO research package\n"
            "Dataset: " + bundle.dataset_id + " / " + bundle.mode + "\n"
            "This dataset includes synthetic enterprise, survey, and relationship records.\n"
            "Survey: data/survey.csv. PLS model: SA(4 indicators)->SU(3), SA+SU->OP(3).\n"
            "SmartPLS/SPSS: import CSV, verify data types, missingness, sample, paths and bootstrap settings.\n"
            "The external_result_template.json contains ZERO PLACEHOLDERS, not estimated coefficients.\n"
            "Copy actual results and upload JSON via /api/v1/external-results.\n"
            "Never label synthetic or mixed results as empirical Boluo findings.\n"))
    return Response(content=memory.getvalue(), media_type="application/zip",
                    headers={"Content-Disposition": 'attachment; filename="boluo-internal-analysis-pack.zip"',
                             "Cache-Control": "no-store"})

@app.post("/api/v1/external-results")
def external_results(req: ExternalResult):
    bundle = load_bundle(req.dataset_id)
    if fingerprint(bundle) != req.dataset_fingerprint:
        raise HTTPException(422, "数据快照指纹不一致，不可对照")
    if req.n != len(bundle.tables["survey"]):
        raise HTTPException(422, "外部分析的样本量与内部数据不一致")
    if not req.software_version or req.software_version == "FILL_ME":
        raise HTTPException(422, "必须提供实际软件版本")
    if set(req.paths) != {"SA->SU", "SA->OP", "SU->OP"}:
        raise HTTPException(422, "结果路径与研究模型不一致")
    if req.model_id != "service_access_mode_a_experimental_v1":
        raise HTTPException(422, "首期只接受对应研究任务的外部结果")
    if req.software not in {"SmartPLS", "SPSS", "R", "Other"}:
        raise HTTPException(422, "未知外部软件")
    if any(abs(v) > 5 or v != v for v in req.paths.values()):
        raise HTTPException(422, "路径结果取值不合法")
    payload = req.model_dump()
    result_id = store.record_external(payload)
    return {"external_result_id": result_id, "dataset_id": req.dataset_id,
            "status": "IMPORTED_UNVERIFIED", "note": "导入并不代表已验证模型等价性。"}

@app.get("/api/v1/comparisons/{external_id}")
def comparison(external_id: str):
    try:
        ext = store.get_external(external_id)
    except KeyError as exc:
        raise HTTPException(404, "外部结果不存在") from exc
    bundle = load_bundle(ext["dataset_id"])
    internal = survey_report(bundle, bootstraps=80, seed=317)
    diffs = {name: {"program": internal["paths"][name], "external": val,
                    "difference": round(internal["paths"][name] - val, 5)}
             for name, val in ext["paths"].items()}
    return {"dataset_id": bundle.dataset_id, "mode": bundle.mode,
            "external_software": ext["software"], "paths": diffs,
            "comparison_status": "EXPLORATORY_NOT_EQUIVALENCE_CERTIFIED",
            "warning": "必须核对软件算法、缺失处理、标准化、测量设定和估计目标；差异不等于模型错误。"}

@app.post("/api/v1/reports")
def make_report(req: ReportRequest):
    b = load_bundle(req.dataset_id)
    try:
        result = scenario(b, req.scenario_id, draws=2500)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    base = result["base"]
    mid = result["sectors_2032"]
    doc = ("# 博罗2032三次产业协同研究 · " + b.mode + "\n\n"
           "数据快照：" + b.dataset_id + "\n\n"
           "## 2025年参考基准\n"
           + f"第一产业 {base['primary']:.2f} 亿元，第二产业 {base['secondary']:.2f} 亿元，"
           + f"第三产业 {base['tertiary']:.2f} 亿元。\n\n"
           "## 2032情景（给定假设的条件模拟）\n"
           + "\n".join(f"- {name}：P10 {mid[name]['p10']:.2f}，P50 {mid[name]['p50']:.2f}，"
                        f"P90 {mid[name]['p90']:.2f} 亿元" for name in ("primary", "secondary", "tertiary"))
           + "\n\n## 研究边界\n"
           "本报告采用合成数据与研究情景假设；不构成对真实企业、经济增长或政策影响的预测。\n"
           "调查模型系数不能直接折算GDP。未经核实的真实数据不得作为官方结论。\n")
    return Response(doc, media_type="text/markdown; charset=utf-8",
                    headers={"Content-Disposition": 'attachment; filename="boluo-2032-demo-report.md"',
                             "Cache-Control": "no-store"})

app.mount("/static", StaticFiles(directory=ROOT / "web"), name="static")
