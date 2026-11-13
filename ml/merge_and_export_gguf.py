#!/usr/bin/env python3
"""Merges a LoRA adapter into its base model and exports GGUF (quantized)
for Ollama. Called by export_to_ollama.sh — not usually run directly.

Usage:
    python merge_and_export_gguf.py --adapter adapters/greenbridge-v1 --out gguf/greenbridge-v1
"""
import argparse
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--adapter", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--quantization", default="q4_k_m",
                     help="q4_k_m is a good default: small, fast, little quality loss")
    args = ap.parse_args()

    from unsloth import FastLanguageModel

    print(f"Loading adapter {args.adapter} (merged with its base model)...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=str(args.adapter), max_seq_length=2048, dtype=None, load_in_4bit=True,
    )

    args.out.mkdir(parents=True, exist_ok=True)
    print(f"Merging and exporting GGUF ({args.quantization}) to {args.out}...")
    model.save_pretrained_gguf(str(args.out), tokenizer, quantization_method=args.quantization)
    print(f"Done. Look for a .gguf file under {args.out}/")


if __name__ == "__main__":
    main()
