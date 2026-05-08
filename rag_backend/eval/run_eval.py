"""Vernacular FD Advisor Eval Runner v3 — file-driven, multilingual.

Usage (from repo root):
    cd rag_backend && python -m eval.run_eval

Expected on a healthy index + Ollama: ≥25/35 PASS (71%+).

The runner produces three artefacts:
    eval/results_latest.json        — full structured run output (overwritten)
    eval/results_<timestamp>.json   — historical run, dated, never overwritten
    eval/REPORT.md                  — human-readable summary with regression diff

Regression diff is computed against the most recent ``results_*.json`` whose
mtime predates the current run.
"""

from __future__ import annotations

import asyncio
import datetime as _dt
import json
import logging
import re
import sys
from pathlib import Path
from typing import Any, Dict, List

if sys.version_info >= (3, 14):
    sys.stderr.write(
        "\n❌ eval requires Python 3.12 or 3.13 (you have %d.%d).\n\n"
        % (sys.version_info.major, sys.version_info.minor)
    )
    raise SystemExit(1)

_HERE = Path(__file__).resolve().parent
_PROJECT = _HERE.parent
sys.path.insert(0, str(_PROJECT.parent))
sys.path.insert(0, str(_PROJECT))

from dotenv import load_dotenv

load_dotenv(_PROJECT / ".env")

from rag_backend.pipeline.rag_pipeline import query as rag_query
from rag_backend.generation.llm_handler import generate, OllamaError

logging.basicConfig(level=logging.INFO, format="%(message)s")
log = logging.getLogger("eval")

EVAL_FILE = _HERE / "vernacular_fd_eval.json"

LANG_SESSION_MAP: dict[str, List[str]] = {
    "hi": ["kb_rbi_master", "kb_dicgc", "kb_kyc", "kb_suryoday"],
    "hinglish": ["kb_rbi_master", "kb_dicgc", "kb_kyc", "kb_suryoday"],
    "en": ["kb_rbi_master", "kb_dicgc", "kb_sebi", "kb_suryoday"],
    "ta": ["kb_rbi_master", "kb_dicgc"],
    "te": ["kb_rbi_master", "kb_dicgc"],
    "kn": ["kb_rbi_master", "kb_dicgc"],
    "ml": ["kb_rbi_master", "kb_dicgc"],
    "bn": ["kb_rbi_master", "kb_dicgc"],
    "as": ["kb_rbi_master", "kb_dicgc"],
    "or": ["kb_rbi_master", "kb_dicgc"],
    "mr": ["kb_rbi_master", "kb_dicgc"],
    "gu": ["kb_rbi_master", "kb_dicgc"],
    "pa": ["kb_rbi_master", "kb_dicgc"],
    "ur": ["kb_rbi_master", "kb_dicgc"],
    "bho": ["kb_rbi_master", "kb_dicgc"],
    "mai": ["kb_rbi_master", "kb_dicgc"],
}


def _norm(s: str) -> str:
    return re.sub(r"[\s,₹]", "", s.lower())


def _load_eval() -> dict[str, Any]:
    raw = json.loads(EVAL_FILE.read_text(encoding="utf-8"))
    return raw


RUBRIC = _load_eval().get(
    "rubric",
    "factual_correctness, compliance, language_match, tone, no_hallucinated_advice",
)

JUDGE_PROMPT_TEMPLATE = """\
You are evaluating a financial chatbot answer.

USER QUERY: \"\"\"{query}\"\"\"
AGENT ANSWER: \"\"\"{answer}\"\"\"
RUBRIC: \"\"\"{rubric}\"\"\"
EXPECTED FACTS (must be present): \"\"\"{must_include}\"\"\"
DISALLOWED PATTERNS (must NOT be present): \"\"\"{must_not_include}\"\"\"

Score each dimension 0-3. Output ONLY valid JSON, no markdown, no code fences:
{{"scores":{{"factual_correctness":int,"compliance":int,"language_match":int,"tone":int,"no_hallucinated_advice":int}},"overall_pass":boolean,"violations_found":[string],"missing_facts":[string],"one_line_summary":string}}
"""


def _deterministic_judge(answer: str, case: dict) -> dict:
    must_include = case.get("must_include", [])
    must_not_include = case.get("must_not_include", [])
    al = answer.lower()
    an = _norm(answer)

    missing: List[str] = []
    for m in must_include:
        if _norm(m) not in an and m.lower() not in al:
            missing.append(m)

    violations: List[str] = []
    for m in must_not_include:
        if m.lower() in al:
            violations.append(m)

    passed = len(missing) == 0 and len(violations) == 0
    score = 3 if passed else 1
    return {
        "scores": {
            "factual_correctness": score,
            "compliance": 3 if not violations else 0,
            "language_match": 3,
            "tone": 3,
            "no_hallucinated_advice": 3 if not violations else 0,
        },
        "overall_pass": passed,
        "violations_found": violations,
        "missing_facts": missing,
        "one_line_summary": "PASS" if passed else f"missing {missing}; violations {violations}",
    }


async def _judge(query_text: str, answer: str, case: dict, rubric: str) -> dict:
    prompt = JUDGE_PROMPT_TEMPLATE.format(
        query=query_text,
        answer=answer,
        rubric=rubric,
        must_include=str(case.get("must_include", [])),
        must_not_include=str(case.get("must_not_include", [])),
    )
    try:
        raw = await generate(prompt=prompt, system="You are a strict eval judge.", max_tokens=400, temperature=0.0)
    except OllamaError as exc:
        log.warning("judge unreachable: %s", exc)
        return _deterministic_judge(answer, case)

    raw = raw.strip()
    raw = re.sub(r"```json|```", "", raw).strip()
    start = raw.find("{")
    end = raw.rfind("}")
    if start >= 0 and end > start:
        try:
            return json.loads(raw[start : end + 1])
        except json.JSONDecodeError:
            pass
    return _deterministic_judge(answer, case)


def _prompt_language(lang: str) -> str:
    if lang == "hinglish":
        return "hi"
    return lang


async def run_case(case: dict, rubric: str) -> dict:
    lang = case["lang"]
    sessions = LANG_SESSION_MAP.get(lang, ["kb_rbi_master", "kb_dicgc"])
    plang = _prompt_language(lang)
    result = await rag_query(
        session_ids=sessions,
        question=case["user"],
        language=plang,
        top_k=8,
    )
    answer = result.get("answer", "")
    verdict = await _judge(case["user"], answer, case, rubric)
    return {
        "id": case["id"],
        "lang": lang,
        "category": case.get("category", "core"),
        "intent": result.get("intent"),
        "gated": result.get("gated"),
        "pass": verdict.get("overall_pass", False),
        "scores": verdict.get("scores", {}),
        "violations": verdict.get("violations_found", []),
        "missing": verdict.get("missing_facts", []),
        "summary": verdict.get("one_line_summary", ""),
        "answer_preview": (answer[:120] + "…") if len(answer) > 120 else answer,
    }


def _group_by(results: List[dict], key: str) -> Dict[str, dict]:
    out: Dict[str, dict] = {}
    for r in results:
        k = str(r.get(key) or "—")
        bucket = out.setdefault(k, {"pass": 0, "fail": 0, "ids": []})
        if r.get("pass"):
            bucket["pass"] += 1
        else:
            bucket["fail"] += 1
            bucket["ids"].append(r.get("id"))
    return out


def _find_previous_results(now_path: Path) -> Path | None:
    """Find the most recent ``results_<timestamp>.json`` *predating* this run."""
    candidates = sorted(
        (
            p
            for p in _HERE.glob("results_*.json")
            if p.name != "results_latest.json" and p != now_path
        ),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    return candidates[0] if candidates else None


def _diff_against(
    current: List[dict], prev_path: Path
) -> tuple[List[str], List[str], List[str]]:
    """Return (newly_passing, newly_failing, still_failing)."""
    try:
        prev = json.loads(prev_path.read_text(encoding="utf-8"))
    except Exception:
        return [], [], []
    prev_pass = {r["id"]: bool(r.get("pass")) for r in prev.get("results", [])}
    cur_pass = {r["id"]: bool(r.get("pass")) for r in current}

    newly_pass: List[str] = []
    newly_fail: List[str] = []
    still_fail: List[str] = []
    for cid, ok_now in cur_pass.items():
        ok_prev = prev_pass.get(cid)
        if ok_now and ok_prev is False:
            newly_pass.append(cid)
        elif (not ok_now) and ok_prev is True:
            newly_fail.append(cid)
        elif (not ok_now) and ok_prev is False:
            still_fail.append(cid)
    return newly_pass, newly_fail, still_fail


def _write_report(
    results: List[dict],
    summary: dict,
    by_lang: Dict[str, dict],
    by_category: Dict[str, dict],
    dim_avgs: Dict[str, float],
    diff: tuple[List[str], List[str], List[str]],
    prev_path: Path | None,
) -> Path:
    """Write a human-readable Markdown report — judge-friendly."""
    lines: List[str] = []
    lines.append("# Vernacular FD Advisor — Eval Report")
    lines.append("")
    lines.append(f"_Run: {_dt.datetime.now().isoformat(timespec='seconds')}_")
    lines.append("")
    lines.append("## Headline")
    lines.append("")
    pct = summary["pct"]
    badge = "🟢" if pct >= 73 else "🟡" if pct >= 60 else "🔴"
    lines.append(
        f"**{badge} {summary['passed']} / {summary['total']} PASS ({pct}%)**"
    )
    lines.append("")

    lines.append("## Per-language breakdown")
    lines.append("")
    lines.append("| Language | Pass | Fail | Failures |")
    lines.append("|---|---|---|---|")
    for lang, agg in sorted(
        by_lang.items(), key=lambda kv: -(kv[1]["pass"] + kv[1]["fail"])
    ):
        ids = ", ".join(agg["ids"]) if agg["ids"] else "—"
        lines.append(f"| `{lang}` | {agg['pass']} | {agg['fail']} | {ids} |")
    lines.append("")

    lines.append("## Per-category breakdown")
    lines.append("")
    lines.append("| Category | Pass | Fail | Failures |")
    lines.append("|---|---|---|---|")
    for cat, agg in sorted(
        by_category.items(), key=lambda kv: -(kv[1]["pass"] + kv[1]["fail"])
    ):
        ids = ", ".join(agg["ids"]) if agg["ids"] else "—"
        lines.append(f"| `{cat}` | {agg['pass']} | {agg['fail']} | {ids} |")
    lines.append("")

    lines.append("## Per-dimension averages (rubric scored 0-3)")
    lines.append("")
    lines.append("| Dimension | Avg |")
    lines.append("|---|---|")
    for d, v in dim_avgs.items():
        lines.append(f"| {d} | {v:.2f} / 3.00 |")
    lines.append("")

    if prev_path:
        newly_pass, newly_fail, still_fail = diff
        lines.append("## Regression diff")
        lines.append("")
        lines.append(f"_Compared to_ `{prev_path.name}`")
        lines.append("")
        lines.append(
            f"- ✅ Newly passing: {', '.join(newly_pass) if newly_pass else '—'}"
        )
        lines.append(
            f"- ❌ Newly failing: {', '.join(newly_fail) if newly_fail else '—'}"
        )
        lines.append(
            f"- 🔁 Still failing: {', '.join(still_fail) if still_fail else '—'}"
        )
        lines.append("")
        if newly_fail:
            lines.append("> **Regression alert** — fix newly-failing cases before demo.")
            lines.append("")

    lines.append("## All cases")
    lines.append("")
    lines.append("| ID | Lang | Cat | Status | Summary |")
    lines.append("|---|---|---|---|---|")
    for r in results:
        status = "✅" if r.get("pass") else "❌"
        summary_txt = (r.get("summary") or "").replace("|", "\\|")[:80]
        lines.append(
            f"| `{r['id']}` | {r['lang']} | {r.get('category', '—')} | {status} | {summary_txt} |"
        )
    lines.append("")

    out = _HERE / "REPORT.md"
    out.write_text("\n".join(lines), encoding="utf-8")
    return out


async def main() -> int:
    data = _load_eval()
    cases = data["cases"]
    rubric = data.get("rubric", RUBRIC)

    log.info("%s", "=" * 60)
    log.info("Vernacular FD Advisor Eval — %d cases", len(cases))
    log.info("%s\n", "=" * 60)

    results: List[dict] = []
    for case in cases:
        log.info("Running %s (%s, %s)…", case["id"], case["lang"], case.get("intent"))
        try:
            r = await run_case(case, rubric)
        except Exception as exc:
            log.exception("Case %s failed: %s", case["id"], exc)
            r = {
                "id": case["id"],
                "lang": case["lang"],
                "category": case.get("category", "core"),
                "pass": False,
                "summary": str(exc),
                "answer_preview": "",
            }
        results.append(r)
        status = "✅ PASS" if r.get("pass") else "❌ FAIL"
        log.info("  %s | %s", status, r.get("summary", ""))
        if r.get("violations"):
            log.info("  Violations: %s", r["violations"])
        if r.get("missing"):
            log.info("  Missing: %s", r["missing"])
        log.info("")

    passed = sum(1 for r in results if r.get("pass"))
    total = len(results)
    pct = int(100 * passed / total) if total else 0

    log.info("%s", "=" * 60)
    log.info("OVERALL: %d/%d PASS (%d%%)", passed, total, pct)

    dims = [
        "factual_correctness",
        "compliance",
        "language_match",
        "tone",
        "no_hallucinated_advice",
    ]
    dim_avgs: Dict[str, float] = {}
    for d in dims:
        scores = [int(r["scores"].get(d, 0)) for r in results if r.get("scores")]
        avg = sum(scores) / len(scores) if scores else 0.0
        dim_avgs[d] = avg
        log.info("  %s: %.2f/3.00", d, avg)

    by_lang = _group_by(results, "lang")
    by_cat = _group_by(results, "category")

    log.info("\nPer-language:")
    for lang, agg in by_lang.items():
        log.info("  %s: %d pass / %d fail", lang, agg["pass"], agg["fail"])

    log.info("\nPer-category:")
    for cat, agg in by_cat.items():
        log.info("  %s: %d pass / %d fail", cat, agg["pass"], agg["fail"])
    log.info("%s", "=" * 60)

    summary = {"passed": passed, "total": total, "pct": pct}
    timestamp = _dt.datetime.now().strftime("%Y%m%d_%H%M%S")

    historical_path = _HERE / f"results_{timestamp}.json"
    prev_path = _find_previous_results(historical_path)
    diff = _diff_against(results, prev_path) if prev_path else ([], [], [])

    payload = {
        "summary": summary,
        "by_lang": by_lang,
        "by_category": by_cat,
        "dim_averages": dim_avgs,
        "diff_vs_previous": (
            {
                "previous_file": prev_path.name if prev_path else None,
                "newly_passing": diff[0],
                "newly_failing": diff[1],
                "still_failing": diff[2],
            }
            if prev_path
            else None
        ),
        "results": results,
    }

    historical_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    latest_path = _HERE / "results_latest.json"
    latest_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    report_path = _write_report(
        results, summary, by_lang, by_cat, dim_avgs, diff, prev_path
    )

    log.info("\nResults → %s", latest_path)
    log.info("Historical → %s", historical_path)
    log.info("Report → %s", report_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
