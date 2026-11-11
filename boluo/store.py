"""Private local dataset snapshots. No uploads are written to the code repository."""
from __future__ import annotations

import csv
import hashlib
import io
import json
import os
from pathlib import Path
from typing import Any

from .demo import Bundle, DEMO_ID, clone, fingerprint, generate

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = Path(os.environ.get("BOLUO_DATA_DIR", str(ROOT / ".runtime"))).expanduser()
SCHEMAS = {
    "macro": {"year", "primary", "secondary", "tertiary"},
    "enterprises": {"enterprise_id", "sector", "subsector", "town", "employees", "revenue_million"},
    "survey": {"respondent_id", "SA1", "SA2", "SA3", "SA4", "SU1", "SU2", "SU3", "OP1", "OP2", "OP3"},
    "relations": {"source_id", "target_id", "relation_type", "value_million"},
    "projects": {"project_id", "sector", "stage", "start_year", "investment_million"},
    "workers": {"respondent_id", "sector", "commute_minutes", "skills_gap", "monthly_pay_cny"},
}
INTEGER_FIELDS = {"year", "employees", "start_year", "commute_minutes", "skills_gap",
                  "monthly_pay_cny", *[f"{b}{i}" for b, n in (("SA", 4), ("SU", 3), ("OP", 3)) for i in range(1, n + 1)]}
NUMERIC_FIELDS = INTEGER_FIELDS | {"primary", "secondary", "tertiary", "revenue_million",
                                   "value_million", "investment_million", "size_log"}
KEYS = {"macro": "year", "enterprises": "enterprise_id", "survey": "respondent_id",
        "projects": "project_id", "workers": "respondent_id"}
MAX_BYTES = 3_000_000
MAX_ROWS = 20_000

def parse_upload(filename: str, data: bytes) -> list[dict[str, Any]]:
    if len(data) > MAX_BYTES:
        raise ValueError("文件超过3MB测试限制，正式批量导入另行开发")
    suffix = Path(filename).suffix.lower()
    if suffix == ".csv":
        try:
            reader = csv.DictReader(io.StringIO(data.decode("utf-8-sig"), newline=""))
            rows = list(reader)
        except UnicodeError:
            raise ValueError("CSV文件请保存为UTF-8编码")
    elif suffix == ".xlsx":
        from openpyxl import load_workbook
        try:
            wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
            ws = wb.active
            itr = ws.iter_rows(values_only=True)
            header = next(itr)
            columns = [str(x).strip() if x is not None else "" for x in header]
            rows = []
            for i, values in enumerate(itr):
                if i >= MAX_ROWS:
                    raise ValueError("数据超过单次导入行数限制")
                if all(v is None for v in values):
                    continue
                rows.append(dict(zip(columns, values)))
            wb.close()
        except (ValueError, StopIteration):
            raise
        except Exception as exc:
            raise ValueError("Excel解析失败或文件不安全") from exc
    else:
        raise ValueError("首版只支持UTF-8 CSV或xlsx；其他格式请通过专业软件转出")
    if not rows or len(rows) > MAX_ROWS:
        raise ValueError("数据必须包含1至20000条记录")
    return rows

def validate_rows(kind: str, rows: list[dict]) -> list[dict]:
    if kind not in SCHEMAS:
        raise ValueError("不支持的数据类型")
    if not rows:
        raise ValueError("数据为空")
    missing = SCHEMAS[kind] - set(rows[0])
    if missing:
        raise ValueError("缺少必需字段: " + ",".join(sorted(missing)))
    processed = []
    seen = set()
    for i, original in enumerate(rows):
        clean = {}
        for key, raw in original.items():
            if key is None:
                continue
            key = str(key).strip()
            if key not in SCHEMAS[kind] and key not in {"provenance", "size_log", "enterprise_id", "sector"}:
                continue
            if raw is None or str(raw).strip() == "":
                # Missing required numeric columns must not become zeros.
                if key in SCHEMAS[kind]:
                    raise ValueError(f"第{i+2}行字段{key}缺失")
                continue
            if key in NUMERIC_FIELDS:
                try:
                    v = float(raw)
                    if not (-1e15 < v < 1e15):
                        raise ValueError()
                    if key in INTEGER_FIELDS:
                        if v != int(v):
                            raise ValueError()
                        v = int(v)
                    clean[key] = v
                except (ValueError, TypeError, OverflowError):
                    raise ValueError(f"第{i+2}行字段{key}不是有效数值")
            else:
                clean[key] = str(raw).strip()[:512]
        clean["provenance"] = "IMPORTED_UNVERIFIED"
        if kind in KEYS:
            val = clean[KEYS[kind]]
            if val in seen:
                raise ValueError(f"{kind}主键重复: {val}")
            seen.add(val)
        if kind == "macro":
            if clean["year"] < 1990 or clean["year"] > 2032:
                raise ValueError("年份超出允许范围")
            if any(clean[k] <= 0 for k in ("primary", "secondary", "tertiary")):
                raise ValueError("三次产业增加值必须大于0")
        elif kind == "survey":
            if any(not 1 <= clean[x] <= 7 for x in SCHEMAS["survey"] if x not in {"respondent_id"}):
                raise ValueError("问卷指标须为1到7的整数")
        elif kind == "relations" and clean["value_million"] < 0:
            raise ValueError("采购关系金额不得为负")
        processed.append(clean)
    if kind == "macro" and sum(1 for r in processed if r["year"] == 2025) != 1:
        raise ValueError("宏观数据必须包含恰好一条2025基准")
    return processed

class DatasetStore:
    def __init__(self, directory: Path | None = None):
        self.directory = Path(directory) if directory is not None else DATA_DIR
        self.directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        self.snapshots = self.directory / "snapshots"
        self.runs_dir = self.directory / "runs"
        self.snapshots.mkdir(exist_ok=True, mode=0o700)
        self.runs_dir.mkdir(exist_ok=True, mode=0o700)
        self._demo = generate()
        self._bundles = {DEMO_ID: self._demo}
        self._runs = {}
        self._external = {}
    def get(self, dataset_id: str) -> Bundle:
        if dataset_id in self._bundles:
            return clone(self._bundles[dataset_id])
        if not dataset_id.startswith("SNAP-") or len(dataset_id) != 21:
            raise KeyError("未知数据快照")
        path = self.snapshots / (dataset_id + ".json")
        if not path.is_file():
            raise KeyError("数据快照不存在")
        raw = json.loads(path.read_text(encoding="utf-8"))
        b = Bundle(**raw)
        self._bundles[dataset_id] = b
        return clone(b)
    def update_table(self, base_id: str, kind: str, rows: list[dict]) -> Bundle:
        clean = validate_rows(kind, rows)
        prior = self.get(base_id)
        new = clone(prior)
        new.tables[kind] = clean
        new.provenance[kind] = "IMPORTED_UNVERIFIED"
        if kind == "macro":
            new.provenance.pop("macro_2025", None)
        full_real = all(new.provenance.get(k) == "IMPORTED_UNVERIFIED" for k in SCHEMAS)
        new.mode = "REAL_UNVERIFIED" if full_real else "MIXED"
        new.note = "Import is unverified until source authorization, quality and model suitability are reviewed."
        new.dataset_id = "SNAP-" + fingerprint(new)[:16]
        path = self.snapshots / (new.dataset_id + ".json")
        if not path.exists():
            path.write_text(json.dumps(vars(new), ensure_ascii=False, indent=2), encoding="utf-8")
            os.chmod(path, 0o600)
        self._bundles[new.dataset_id] = new
        return clone(new)
    def record(self, run: dict) -> None:
        rid = run["run_id"]
        if "/" in rid or ".." in rid or not rid.replace("-", "").isalnum():
            raise ValueError("非法运行编号")
        content = json.dumps(run, ensure_ascii=False, indent=2)
        p = self.runs_dir / (rid + ".json")
        if p.exists() and p.read_text(encoding="utf-8") != content:
            raise ValueError("相同运行编号的结果发生冲突")
        if not p.exists():
            p.write_text(content, encoding="utf-8")
            os.chmod(p, 0o600)
        self._runs[rid] = run
    def get_run(self, rid: str) -> dict:
        if rid in self._runs:
            return self._runs[rid]
        if "/" in rid or ".." in rid or not rid.replace("-", "").isalnum():
            raise KeyError("无效运行编号")
        p = self.runs_dir / (rid + ".json")
        if not p.is_file():
            raise KeyError("运行记录不存在")
        return json.loads(p.read_text(encoding="utf-8"))
    def record_external(self, payload: dict):
        blob = json.dumps(payload, ensure_ascii=False, sort_keys=True)
        key = "EXT-" + hashlib.sha256(blob.encode("utf-8")).hexdigest()[:16]
        self._external[key] = payload
        p = self.runs_dir / (key + ".json")
        if not p.exists():
            p.write_text(blob, encoding="utf-8")
            os.chmod(p, 0o600)
        return key
    def get_external(self, key: str) -> dict:
        if key in self._external:
            return self._external[key]
        return self.get_run(key)
