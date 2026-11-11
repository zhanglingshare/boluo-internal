"""Real Chromium smoke test: renders the internal workbench on desktop and mobile.

Run after: pip install playwright && python -m playwright install chromium
"""
from __future__ import annotations
import os
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = ROOT / "artifacts" / "browser"
ARTIFACTS.mkdir(parents=True, exist_ok=True)

def main():
    with tempfile.TemporaryDirectory(prefix="boluo-browser-") as tmp:
        env = dict(os.environ)
        env["BOLUO_DATA_DIR"] = tmp
        env.pop("BOLUO_INTERNAL_TOKEN", None)
        proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "boluo.app:app", "--host",
                                 "127.0.0.1", "--port", "8876"], cwd=ROOT, env=env,
                                stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        try:
            for _ in range(100):
                if proc.poll() is not None:
                    raise AssertionError("API process exited unexpectedly")
                try:
                    with urllib.request.urlopen("http://127.0.0.1:8876/api/v1/health", timeout=1) as resp:
                        if resp.status == 200:
                            break
                except Exception:
                    time.sleep(.2)
            else:
                raise AssertionError("API failed to start within 20 seconds")
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
                try:
                    for width, height in ((1440, 960), (390, 844)):
                        mobile = width == 390
                        context = browser.new_context(viewport={"width": width, "height": height},
                                                     is_mobile=mobile, has_touch=mobile)
                        page = context.new_page()
                        errors = []
                        page.on("pageerror", lambda e: errors.append(str(e)))
                        page.goto("http://127.0.0.1:8876/", wait_until="networkidle")
                        page.locator("#gdp2032").wait_for(state="visible")
                        page.wait_for_function('document.querySelector("#gdp2032").textContent.trim() !== "—"')
                        assert "DEMO" in page.locator("#modeBadge").inner_text()
                        assert page.locator("#bar2032 span").count() == 3
                        page.locator('button[data-scenario="industrial"]').click()
                        page.wait_for_function('document.querySelector("#scenarioTitle").textContent.includes("制造业升级")')
                        page.locator('button[data-tab="network"]').click()
                        page.locator("#serviceDemand .demand-item").first.wait_for()
                        assert page.locator("#networkDiagram svg").count() == 1
                        page.locator('button[data-tab="model"]').click()
                        page.locator("#modelOutput .path-row").first.wait_for(timeout=20000)
                        assert page.locator("#modelOutput .path-row").count() == 3
                        page.locator('button[data-tab="data"]').click()
                        assert page.locator("#datasetDetails .dataset-item").count() >= 8
                        layout = page.evaluate('({width: innerWidth, scroll: document.documentElement.scrollWidth})')
                        assert layout["scroll"] <= layout["width"] + 2, layout
                        assert errors == [], errors
                        page.locator('button[data-tab="scenario"]').click()
                        page.screenshot(path=str(ARTIFACTS / ("mobile.png" if mobile else "desktop.png")),
                                        full_page=True, animations="disabled")
                        context.close()
                finally:
                    browser.close()
        finally:
            proc.terminate()
            try:
                proc.wait(timeout=8)
            except subprocess.TimeoutExpired:
                proc.kill(); proc.wait()
    print("Browser smoke PASS: desktop, mobile, scenarios, network, PLS and data tab.")

if __name__ == "__main__":
    main()
