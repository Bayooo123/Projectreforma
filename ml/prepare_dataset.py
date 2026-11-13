#!/usr/bin/env python3
"""Converts the raw export from /api/admin/export-training-data into
chat-formatted train/val JSONL for finetune.py.

Usage:
    python prepare_dataset.py raw_export.jsonl --out dataset/
"""
import argparse
import json
import random
from pathlib import Path

SYSTEM_PROMPT = (
    "You are a Senior Associate at Greenbridge Attorneys, a Lagos litigation "
    "chambers. Draft client-update letters in the firm's own house style: "
    "precise, no invented facts, British English. Use only the facts given."
)

TASK_TEMPLATE = (
    "Draft a client-update letter based on the following context.\n\n{context}"
)


def load_rows(path: Path):
    rows = []
    with open(path) as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            rows.append(json.loads(line))
    return rows


def to_example(row):
    final = (row.get("finalText") or "").strip()
    context = (row.get("context") or "").strip()
    if not final or not context:
        return None
    return {
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": TASK_TEMPLATE.format(context=context)},
            {"role": "assistant", "content": final},
        ]
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("raw_export", type=Path)
    ap.add_argument("--out", type=Path, default=Path("dataset"))
    ap.add_argument("--include-unedited", action="store_true",
                     help="Also keep drafts the lawyer sent unchanged (edited=false). "
                          "Only do this once you have plenty of edited rows, or the "
                          "unedited ones will dominate and the model will just learn "
                          "to copy its own first drafts.")
    ap.add_argument("--val-split", type=float, default=0.1)
    ap.add_argument("--seed", type=int, default=42)
    args = ap.parse_args()

    rows = load_rows(args.raw_export)
    if not args.include_unedited:
        rows = [r for r in rows if r.get("edited")]

    examples = [e for e in (to_example(r) for r in rows) if e is not None]

    if len(examples) < 50:
        print(f"WARNING: only {len(examples)} usable examples. Fine-tuning below "
              f"~50-100 rows tends to overfit to noise rather than learn real style. "
              f"Consider waiting for more /first-draft approvals, or pass "
              f"--include-unedited if you have very few edited rows so far.")

    random.seed(args.seed)
    random.shuffle(examples)
    n_val = max(1, int(len(examples) * args.val_split)) if examples else 0
    val, train = examples[:n_val], examples[n_val:]

    args.out.mkdir(parents=True, exist_ok=True)
    for name, split in [("train.jsonl", train), ("val.jsonl", val)]:
        with open(args.out / name, "w") as f:
            for ex in split:
                f.write(json.dumps(ex) + "\n")

    print(f"Wrote {len(train)} train / {len(val)} val examples to {args.out}/")


if __name__ == "__main__":
    main()
