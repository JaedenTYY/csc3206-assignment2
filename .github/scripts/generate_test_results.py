"""Build the GitHub Pages verification summary from actual test artifacts."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import platform
import xml.etree.ElementTree as ET
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("junit_xml", type=Path)
    parser.add_argument("coverage_json", type=Path)
    parser.add_argument("output_json", type=Path)
    return parser.parse_args()


def junit_counts(path: Path) -> dict[str, int]:
    root = ET.parse(path).getroot()
    suites = [root] if root.tag == "testsuite" else list(root.findall("testsuite"))

    counts = {"tests": 0, "failures": 0, "errors": 0, "skipped": 0}
    for suite in suites:
        for key in counts:
            counts[key] += int(suite.attrib.get(key, 0))
    return counts


def main() -> None:
    args = parse_args()
    counts = junit_counts(args.junit_xml)
    coverage = json.loads(args.coverage_json.read_text(encoding="utf-8"))
    unsuccessful = counts["failures"] + counts["errors"]
    passed = counts["tests"] - unsuccessful - counts["skipped"]

    result = {
        "total_tests": counts["tests"],
        "passed_tests": passed,
        "failed_tests": unsuccessful,
        "skipped_tests": counts["skipped"],
        "coverage_percent": round(coverage["totals"]["percent_covered"]),
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "python_version": ".".join(platform.python_version_tuple()[:2]),
        "workflow_status": "passing" if unsuccessful == 0 else "failing",
    }

    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(
        json.dumps(result, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
