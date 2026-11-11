"""Deterministic economic scenarios and exploratory statistics for the synthetic DEMO.

The PLS code is an explicitly experimental Mode-A path implementation, not a
certified clone of SmartPLS. Econometric coefficients are not GDP contributions.
"""
from __future__ import annotations

from collections import Counter, defaultdict
import hashlib
import json
from typing import Any

import networkx as nx
import numpy as np

from .demo import BASE_2025, Bundle

SECTORS = ("primary", "secondary", "tertiary")
TARGET_SHARE = np.array([.10, .50, .40])
BASE_GROWTH = np.array([.060, .073, .105])
SCENARIOS = {
    "balanced": {"label": "三次产业协同", "delta": [0, 0, 0]},
    "industrial": {"label": "制造业升级", "delta": [0, .017, .004]},
    "agriculture": {"label": "农业提质与价值链", "delta": [.026, .004, .009]},
    "service": {"label": "生产性服务增强", "delta": [.002, .007, .020]},
    "stress": {"label": "项目延期与人才约束", "delta": [-.006, -.017, -.016]},
}
KNOB_EFFECTS = {
    "agriculture": np.array([.023, .002, .003]),
    "manufacturing": np.array([.001, .016, .004]),
    "services": np.array([.001, .004, .019]),
    "talent": np.array([0, .008, .011]),
    "project_delay": np.array([0, -.014, -.004]),
}

def _round(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _round(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_round(v) for v in obj]
    if isinstance(obj, (float, np.floating)):
        val = float(obj)
        return round(val, 5) if np.isfinite(val) else None
    if isinstance(obj, (int, np.integer)):
        return int(obj)
    return obj

def macro_baseline(bundle: Bundle) -> dict:
    rows = sorted(bundle.tables["macro"], key=lambda r: int(r["year"]))
    matches = [r for r in rows if int(r["year"]) == 2025]
    if len(matches) != 1:
        raise ValueError("2025基准必须恰好有一条记录；不能自动猜测基准年份")
    m = matches[0]
    values = np.array([float(m[k]) for k in SECTORS])
    if not np.all(np.isfinite(values)) or np.any(values <= 0):
        raise ValueError("产业增加值必须是正数")
    return {"year": 2025, **{k: float(m[k]) for k in SECTORS}, "gdp": float(values.sum()),
            "shares": {k: float(v / values.sum()) for k, v in zip(SECTORS, values)},
            "provenance": m.get("provenance", bundle.provenance.get("macro", "UNKNOWN"))}

def _growth_settings(scenario: str, knobs: dict | None) -> np.ndarray:
    if scenario not in SCENARIOS:
        raise ValueError("未知情景: " + str(scenario))
    growth = BASE_GROWTH + np.array(SCENARIOS[scenario]["delta"], dtype=float)
    for name, raw in (knobs or {}).items():
        if name not in KNOB_EFFECTS:
            raise ValueError("未知条件: " + name)
        if isinstance(raw, bool) or not isinstance(raw, (float, int)) or not np.isfinite(float(raw)):
            raise ValueError("条件取值必须是有限数字")
        if not -1 <= float(raw) <= 1:
            raise ValueError("条件超出允许范围[-1,1]")
        growth += KNOB_EFFECTS[name] * float(raw)
    if np.any(growth <= -.25) or np.any(growth >= .35):
        raise ValueError("年增长假设超出情景允许范围")
    return growth

def scenario(bundle: Bundle, scenario_id: str = "balanced", knobs: dict | None = None,
             draws: int = 2500, seed: int = 2032) -> dict:
    if not isinstance(draws, int) or not 300 <= draws <= 10000:
        raise ValueError("轨迹数须为300至10000")
    if not isinstance(seed, int) or not 0 <= seed < 2**32:
        raise ValueError("随机种子无效")
    base = macro_baseline(bundle)
    values = np.array([base[k] for k in SECTORS], dtype=float)
    rates = _growth_settings(scenario_id, knobs)
    rng = np.random.default_rng(seed)
    corr = np.array([[1, .20, .13], [.20, 1, .32], [.13, .32, 1]], dtype=float)
    sd = np.array([.026, .035, .040])
    cholesky = np.linalg.cholesky(corr) * sd[:, None]
    cur = np.tile(values, (draws, 1))
    medians_by_year = [{"year": 2025, **{k: float(v) for k, v in zip(SECTORS, values)},
                        "gdp": float(values.sum())}]
    for year in range(2026, 2033):
        shock = rng.standard_normal((draws, 3)) @ cholesky.T
        growth_step = np.clip(rates + shock, -.18, .30)
        cur = cur * (1.0 + growth_step)
        med = np.median(cur, axis=0)
        medians_by_year.append({"year": year, **dict(zip(SECTORS, med.tolist())),
                                "gdp": float(np.median(cur.sum(axis=1)))})
    totals = cur.sum(axis=1)
    shares = cur / totals[:, None]
    sector_result = {}
    for j, key in enumerate(SECTORS):
        lo, mid, hi = np.quantile(cur[:, j], [.10, .50, .90])
        share_mid = np.median(shares[:, j])
        sector_result[key] = {"p10": lo, "p50": mid, "p90": hi, "share_p50": share_mid}
    t10, t50, t90 = np.quantile(totals, [.10, .50, .90])
    tolerance = np.max(np.abs(shares - TARGET_SHARE[None, :]), axis=1) <= .01
    # Explicitly conditional Demo probability, NOT an empirical forecast.
    out = {
        "mode": bundle.mode, "dataset_id": bundle.dataset_id,
        "scenario_id": scenario_id, "scenario_label": SCENARIOS[scenario_id]["label"],
        "source_type": "DEMO_OR_ASSUMPTION_BASED_CONDITIONAL_SCENARIO",
        "notes": ["2032分布来自设定的年增速和扰动假设，不是对博罗未来的经验预测",
                  "产出为产业增加值示意；企业营业收入未被直接折算为GDP",
                  "结构接近度只说明给定假设下接近目标的比例，不代表政策成功概率"],
        "base": base, "annual_nominal_growth_assumptions": dict(zip(SECTORS, rates.tolist())),
        "seed": seed, "draws": draws,
        "target_share": dict(zip(SECTORS, TARGET_SHARE.tolist())),
        "yearly_p50": medians_by_year, "sectors_2032": sector_result,
        "total_2032": {"p10": t10, "p50": t50, "p90": t90},
        "share_2032_p50": dict(zip(SECTORS, np.median(shares, axis=0).tolist())),
        "within_one_percentage_point": float(tolerance.mean()),
        "histogram_2032": {
            "edges": np.histogram(totals, bins=24)[1].tolist(),
            "counts": np.histogram(totals, bins=24)[0].tolist()
        },
    }
    rid = hashlib.sha256(json.dumps({"dataset_id": bundle.dataset_id, "rates": rates.tolist(),
              "draws": draws, "seed": seed, "fingerprint": base}, sort_keys=True).encode()).hexdigest()[:16]
    out["run_id"] = "SCN-" + rid
    return _round(out)

def network_report(bundle: Bundle) -> dict:
    ids = {r["enterprise_id"]: r for r in bundle.tables["enterprises"]}
    graph = nx.DiGraph()
    graph.add_nodes_from(ids)
    categories = Counter()
    demand = defaultdict(float)
    by_service = defaultdict(float)
    missing_endpoints = 0
    for r in bundle.tables["relations"]:
        a, b = r["source_id"], r["target_id"]
        if a not in ids or b not in ids:
            missing_endpoints += 1
            continue
        amount = float(r["value_million"])
        graph.add_edge(a, b, weight=amount, relation_type=r["relation_type"])
        categories[r["relation_type"]] += 1
        demand[r["relation_type"]] += amount
        if ids[b]["sector"] == "services":
            by_service[ids[b]["subsector"]] += amount
    degrees = sorted(graph.in_degree(weight="weight"), key=lambda x: x[1], reverse=True)[:7]
    return _round({
        "dataset_id": bundle.dataset_id, "mode": bundle.mode,
        "node_count": graph.number_of_nodes(), "edge_count": graph.number_of_edges(),
        "missing_endpoint_count": missing_endpoints,
        "relation_counts": dict(categories), "service_demand_million": dict(by_service),
        "sum_synthetic_relation_value_million": dict(demand),
        "top_receivers": [{"enterprise_id": key, "incoming_weight_million": val,
                           "type": ids[key]["subsector"]} for key, val in degrees],
        "warning": "网络边为合成关系；权重为合成交易额，不是GDP增加值。真实关系未经核实。",
    })

BLOCKS = {"SA": ["SA1", "SA2", "SA3", "SA4"],
          "SU": ["SU1", "SU2", "SU3"],
          "OP": ["OP1", "OP2", "OP3"]}
PATHS = {"SU": ["SA"], "OP": ["SA", "SU"]}

def _z(x):
    x = np.asarray(x, dtype=float)
    sd = x.std(axis=0, ddof=0)
    if np.any(sd < 1.e-8):
        raise ValueError("问卷存在零方差指标，无法分析")
    return (x - x.mean(axis=0)) / sd

def _alpha(x):
    k = x.shape[1]
    total_var = x.sum(axis=1).var(ddof=1)
    if total_var < 1.e-10:
        return None
    return float(k / (k - 1) * (1.0 - x.var(axis=0, ddof=1).sum() / total_var))

def _pls_estimate(data: dict[str, np.ndarray], iterations: int = 120) -> dict:
    """Small Mode-A PLS path estimator for cross-checking, NOT a SmartPLS clone."""
    names = tuple(BLOCKS)
    weights = {name: np.ones(data[name].shape[1]) / np.sqrt(data[name].shape[1])
               for name in names}
    adjacency = {"SA": ("SU", "OP"), "SU": ("SA", "OP"), "OP": ("SA", "SU")}
    delta = float("inf")
    for iteration in range(iterations):
        scores = {name: _z(data[name] @ weights[name]) for name in names}
        updated = {}
        for name in names:
            proxy = np.zeros(data[name].shape[0])
            for neighbor in adjacency[name]:
                corr = float(np.mean(scores[name] * scores[neighbor]))
                proxy += (1.0 if corr >= 0 else -1.0) * scores[neighbor]
            next_w = data[name].T @ proxy
            norm = np.linalg.norm(next_w)
            if norm < 1.e-9:
                raise ValueError("PLS外部权重无法估计")
            next_w = next_w / norm
            if np.sum(next_w) < 0:
                next_w = -next_w
            updated[name] = next_w
        delta = max(float(np.linalg.norm(updated[name] - weights[name])) for name in names)
        weights = updated
        if delta < 1.e-8:
            break
    scores = {name: _z(data[name] @ weights[name]).reshape(-1) for name in names}
    paths = {}
    r_squared = {}
    for outcome, inputs in PATHS.items():
        x = np.column_stack([scores[name] for name in inputs])
        y = scores[outcome]
        beta, *_ = np.linalg.lstsq(x, y, rcond=None)
        pred = x @ beta
        r_squared[outcome] = float(1 - np.sum((y - pred)**2) / np.sum(y**2))
        for name, val in zip(inputs, beta):
            paths[f"{name}->{outcome}"] = float(val)
    measurement = {}
    for name, indicators in BLOCKS.items():
        xs = data[name]
        loadings = xs.T @ scores[name] / xs.shape[0]
        measurement[name] = {
            "cronbach_alpha": _alpha(xs), "ave": float(np.mean(loadings**2)),
            "outer_loadings": dict(zip(indicators, loadings.tolist())),
        }
    return {"paths": paths, "r_squared": r_squared, "measurement": measurement,
            "converged": delta < 1.e-8, "iterations": iteration + 1, "delta": delta}

def survey_report(bundle: Bundle, bootstraps: int = 100, seed: int = 317) -> dict:
    if not 30 <= bootstraps <= 1500:
        raise ValueError("bootstrap次数应在30至1500之间")
    rows = bundle.tables["survey"]
    if len(rows) < 60:
        raise ValueError("当前探索模型需要至少60份完整记录，此数量不是正式功效建议")
    all_indicators = [i for inds in BLOCKS.values() for i in inds]
    matrix = []
    for r in rows:
        try:
            values = [float(r[k]) for k in all_indicators]
        except (KeyError, ValueError, TypeError):
            raise ValueError("问卷指标缺失或非数字，必须先清理数据")
        if not all(np.isfinite(v) and 1 <= v <= 7 for v in values):
            raise ValueError("问卷指标必须位于1到7")
        matrix.append(values)
    arr = np.asarray(matrix)
    offsets = [0, 4, 7, 10]
    blocks = {name: _z(arr[:, offsets[i]:offsets[i + 1]])
              for i, name in enumerate(BLOCKS)}
    fit = _pls_estimate(blocks)
    rng = np.random.default_rng(seed)
    per_path = {name: [] for name in fit["paths"]}
    failed = 0
    for _ in range(bootstraps):
        index = rng.integers(0, len(rows), len(rows))
        try:
            sub = {name: _z(blocks[name][index]) for name in BLOCKS}
            result = _pls_estimate(sub)
            for name, value in result["paths"].items():
                per_path[name].append(value)
        except (ValueError, np.linalg.LinAlgError):
            failed += 1
    intervals = {}
    for name, draws in per_path.items():
        if len(draws) < bootstraps * .75:
            intervals[name] = {"low": None, "high": None}
        else:
            low, high = np.quantile(draws, [.025, .975])
            intervals[name] = {"low": float(low), "high": float(high)}
    return _round({
        "model_id": "service_access_mode_a_experimental_v1",
        "dataset_id": bundle.dataset_id, "mode": bundle.mode,
        "n": len(rows), "bootstraps": bootstraps, "failed_bootstraps": failed,
        "constructs": BLOCKS, "paths": fit["paths"], "r_squared": fit["r_squared"],
        "measurement": fit["measurement"], "confidence_intervals": intervals,
        "converged": fit["converged"], "iterations": fit["iterations"],
        "warning": ("探索性Mode-A PLS路径实现，未经与SmartPLS逐项等价验证；"
                    "路径系数不是政策因果效应，更不能直接转换为GDP贡献。"),
    })

def summary(bundle: Bundle) -> dict:
    base = macro_baseline(bundle)
    return {"mode": bundle.mode, "dataset_id": bundle.dataset_id, "baseline": base,
            "records": {k: len(v) for k, v in bundle.tables.items()},
            "target": {"year": 2032, "primary": .1, "secondary": .5, "tertiary": .4},
            "caution": "2032结构是研究目标情景；合成数据不能证明真实博罗的发展结论。"}
