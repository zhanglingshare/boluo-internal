"""One reproducible, linked DEMO economy. Synthetic values must never be described as observed."""
from __future__ import annotations

import copy
import csv
import hashlib
import io
import json
from dataclasses import dataclass
from typing import Any

import numpy as np

DEMO_ID = "BOLUO_2032_DEMO_V1"
SEED = 20321111
# 2025 figures are a reference quoted from published statistics; recheck source before official use.
BASE_2025 = {"primary": 107.44, "secondary": 549.01, "tertiary": 349.00}
TOWNS = ("罗阳", "园洲", "石湾", "龙溪", "长宁", "柏塘", "福田", "湖镇", "龙华", "杨村", "泰美", "公庄")
SERVICE_TYPES = ("研发设计", "检测认证", "物流仓储", "工业软件", "商务服务")
MFG_TYPES = ("电子信息", "装备制造", "新能源材料", "食品加工", "其他制造")
AGRI_TYPES = ("茶叶", "蔬果", "畜牧", "其他农业")

@dataclass
class Bundle:
    dataset_id: str
    mode: str
    provenance: dict[str, str]
    tables: dict[str, list[dict[str, Any]]]
    note: str = ""

def csv_string(rows: list[dict]) -> str:
    if not rows:
        return ""
    stream = io.StringIO(newline="")
    writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
    writer.writeheader()
    for row in rows:
        writer.writerow(row)
    return stream.getvalue()

def _likert(rng: np.random.Generator, latent: float, n: int, noise: float = 0.70) -> list[int]:
    x = 4 + latent * 1.1 + rng.normal(0, noise, n)
    return [int(v) for v in np.clip(np.rint(x), 1, 7)]

def generate(seed: int = SEED) -> Bundle:
    rng = np.random.default_rng(seed)
    macro = []
    for year in range(2020, 2026):
        offset = 2025 - year
        if year == 2025:
            p, s, t = BASE_2025.values()
        else:
            # Explicit synthetic backcast, not historical official statistics.
            p = round(107.44 / (1.057 ** offset), 4)
            s = round(549.01 / (1.083 ** offset), 4)
            t = round(349.00 / (1.088 ** offset), 4)
        macro.append({"year": year, "primary": p, "secondary": s, "tertiary": t,
                      "provenance": "PUBLIC_REFERENCE_CHECK_PENDING" if year == 2025 else "SYNTHETIC"})
    enterprises = []
    for sector, count in (("manufacturing", 300), ("services", 120), ("agriculture", 80)):
        kinds = MFG_TYPES if sector == "manufacturing" else SERVICE_TYPES if sector == "services" else AGRI_TYPES
        for i in range(count):
            eid = f"{sector[:1].upper()}{i+1:04d}"
            employees = int(np.clip(rng.lognormal(3.5 if sector == "manufacturing" else 2.9, .70), 3, 2200))
            revenue = round(float(employees * rng.uniform(.35, 1.25)), 3)  # millions of CNY; synthetic
            enterprises.append({
                "enterprise_id": eid, "sector": sector, "subsector": kinds[i % len(kinds)],
                "town": TOWNS[i % len(TOWNS)], "employees": employees,
                "revenue_million": revenue, "provenance": "SYNTHETIC",
            })
    mfg = [e for e in enterprises if e["sector"] == "manufacturing"]
    services = [e for e in enterprises if e["sector"] == "services"]
    agriculture = [e for e in enterprises if e["sector"] == "agriculture"]
    relations = []
    for j, firm in enumerate(mfg):
        for k in range(2):
            supplier = services[(j * 17 + k * 31) % len(services)]
            relations.append({
                "source_id": firm["enterprise_id"], "target_id": supplier["enterprise_id"],
                "relation_type": "service_purchase", "value_million": round(float(rng.uniform(.05, 4.0)), 3),
                "provenance": "SYNTHETIC",
            })
    for j, farm in enumerate(agriculture):
        target = mfg[(j * 7) % len(mfg)]
        relations.append({
            "source_id": farm["enterprise_id"], "target_id": target["enterprise_id"],
            "relation_type": "agricultural_supply", "value_million": round(float(rng.uniform(.05, 2)), 3),
            "provenance": "SYNTHETIC",
        })
    survey = []
    for firm in mfg:
        size = (np.log1p(firm["employees"]) - 3.5) / 1.4
        access = float(rng.normal(.20 * size, .95))
        usage = .61 * access + .13 * size + float(rng.normal(0, .72))
        perf = .37 * usage + .17 * access + .20 * size + float(rng.normal(0, .78))
        row = {"respondent_id": "R" + firm["enterprise_id"], "enterprise_id": firm["enterprise_id"],
               "sector": firm["sector"], "size_log": round(float(np.log1p(firm["employees"])), 5)}
        row.update({f"SA{k+1}": x for k, x in enumerate(_likert(rng, access, 4))})
        row.update({f"SU{k+1}": x for k, x in enumerate(_likert(rng, usage, 3))})
        row.update({f"OP{k+1}": x for k, x in enumerate(_likert(rng, perf, 3))})
        row["provenance"] = "SYNTHETIC"
        survey.append(row)
    projects = []
    stages = ("signed", "construction", "commissioning", "operating")
    for i in range(30):
        projects.append({
            "project_id": f"P{i+1:03d}", "sector": ("manufacturing", "services", "agriculture")[i % 3],
            "stage": stages[i % len(stages)], "start_year": 2025 + (i % 4),
            "investment_million": round(float(rng.uniform(40, 1200)), 2),
            "provenance": "SYNTHETIC",
        })
    workers = []
    for i in range(250):
        workers.append({
            "respondent_id": f"W{i+1:04d}", "sector": ("manufacturing", "services", "agriculture")[i % 3],
            "commute_minutes": int(rng.integers(8, 100)), "skills_gap": int(rng.integers(1, 6)),
            "monthly_pay_cny": int(rng.integers(3500, 15000)), "provenance": "SYNTHETIC",
        })
    tables = {"macro": macro, "enterprises": enterprises, "survey": survey,
              "relations": relations, "projects": projects, "workers": workers}
    return Bundle(
        dataset_id=DEMO_ID, mode="DEMO",
        provenance={name: "SYNTHETIC" for name in tables} | {"macro_2025": "PUBLIC_REFERENCE_CHECK_PENDING"},
        tables=tables, note="Synthetic research fixture, NOT measured Boluo enterprise relationships or policy effects.",
    )

def fingerprint(bundle: Bundle) -> str:
    raw = json.dumps(bundle.tables, ensure_ascii=False, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

def manifest(bundle: Bundle) -> dict:
    return {"dataset_id": bundle.dataset_id, "mode": bundle.mode, "schema_version": "1",
            "seed": SEED if bundle.dataset_id == DEMO_ID else None,
            "fingerprint_sha256": fingerprint(bundle),
            "counts": {name: len(rows) for name, rows in bundle.tables.items()},
            "provenance": bundle.provenance,
            "note": bundle.note}

def clone(bundle: Bundle) -> Bundle:
    return copy.deepcopy(bundle)
