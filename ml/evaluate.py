#!/usr/bin/env python3
"""Side-by-side comparison of base model vs fine-tuned adapter on held-out
examples. Not automated pass/fail — print output for a lawyer to actually
read and judge. Don't ship an adapter nobody has reviewed.

Usage:
    python evaluate.py --base-model unsloth/Qwen2.5-7B-Instruct-bnb-4bit \
        --adapter adapters/greenbridge-v1 --dataset dataset/val.jsonl
"""
import argparse
import json
from pathlib import Path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-model", required=True)
    ap.add_argument("--adapter", type=Path, required=True)
    ap.add_argument("--dataset", type=Path, required=True)
    ap.add_argument("--max-new-tokens", type=int, default=512)
    ap.add_argument("--limit", type=int, default=10,
                     help="Max number of val examples to run (keeps review manageable)")
    args = ap.parse_args()

    from unsloth import FastLanguageModel
    import torch

    rows = [json.loads(l) for l in open(args.dataset) if l.strip()][:args.limit]
    if not rows:
        print("No rows in the val set — nothing to evaluate.")
        return

    def generate(model, tokenizer, messages):
        FastLanguageModel.for_inference(model)
        inputs = tokenizer.apply_chat_template(
            messages, tokenize=True, add_generation_prompt=True, return_tensors="pt"
        ).to("cuda")
        out = model.generate(input_ids=inputs, max_new_tokens=args.max_new_tokens,
                              use_cache=True, temperature=0.3)
        text = tokenizer.decode(out[0][inputs.shape[1]:], skip_special_tokens=True)
        return text.strip()

    print(f"Loading base model {args.base_model}...")
    base_model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=args.base_model, max_seq_length=2048, dtype=None, load_in_4bit=True,
    )

    for i, row in enumerate(rows):
        prompt_messages = row["messages"][:-1]  # everything except the gold assistant turn
        gold = row["messages"][-1]["content"]

        base_output = generate(base_model, tokenizer, prompt_messages)

        print(f"\n{'=' * 70}\nExample {i + 1}/{len(rows)}\n{'=' * 70}")
        print(f"\n--- CONTEXT ---\n{prompt_messages[-1]['content']}")
        print(f"\n--- WHAT THE LAWYER ACTUALLY SENT (gold) ---\n{gold}")
        print(f"\n--- BASE MODEL (no fine-tuning) ---\n{base_output}")

    print(f"\n{'=' * 70}\nLoading fine-tuned adapter from {args.adapter}...\n{'=' * 70}")
    del base_model
    import gc
    gc.collect()
    torch.cuda.empty_cache()

    tuned_model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=str(args.adapter), max_seq_length=2048, dtype=None, load_in_4bit=True,
    )

    for i, row in enumerate(rows):
        prompt_messages = row["messages"][:-1]
        tuned_output = generate(tuned_model, tokenizer, prompt_messages)
        print(f"\n{'=' * 70}\nExample {i + 1}/{len(rows)} — FINE-TUNED OUTPUT\n{'=' * 70}")
        print(tuned_output)

    print("\nRead every example above. Judge: does the fine-tuned output read more "
          "like the firm's own letters than the base model's? If not, more training "
          "data or more epochs is needed before this adapter is used for anything real.")


if __name__ == "__main__":
    main()
