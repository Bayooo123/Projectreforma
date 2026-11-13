#!/usr/bin/env python3
"""QLoRA fine-tune of an open-weight model on the firm's own house style,
using Unsloth. Run on a GPU laptop (16GB+ VRAM) — see ../README.md.

Usage:
    python finetune.py --base-model unsloth/Qwen2.5-7B-Instruct-bnb-4bit \
        --dataset dataset/ --out adapters/greenbridge-v1
"""
import argparse
from pathlib import Path


def infer_chat_template(base_model: str) -> str:
    name = base_model.lower()
    if "qwen" in name:
        return "qwen-2.5"
    if "llama-3.1" in name or "llama3.1" in name:
        return "llama-3.1"
    if "llama-3" in name:
        return "llama-3"
    if "mistral" in name:
        return "mistral"
    return "chatml"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base-model", required=True,
                     help="e.g. unsloth/Qwen2.5-7B-Instruct-bnb-4bit")
    ap.add_argument("--dataset", type=Path, required=True,
                     help="Directory with train.jsonl / val.jsonl from prepare_dataset.py")
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--chat-template", default=None,
                     help="Overrides auto-detection from --base-model")
    ap.add_argument("--max-seq-length", type=int, default=2048)
    ap.add_argument("--lora-r", type=int, default=16)
    ap.add_argument("--epochs", type=int, default=3)
    ap.add_argument("--batch-size", type=int, default=2)
    ap.add_argument("--grad-accum", type=int, default=4)
    ap.add_argument("--learning-rate", type=float, default=2e-4)
    args = ap.parse_args()

    # Imported here, not at module top, so --help works without a GPU/CUDA present.
    from unsloth import FastLanguageModel, is_bfloat16_supported
    from unsloth.chat_templates import get_chat_template
    from datasets import load_dataset
    from trl import SFTTrainer, SFTConfig

    print(f"Loading {args.base_model} in 4-bit...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=args.base_model,
        max_seq_length=args.max_seq_length,
        dtype=None,
        load_in_4bit=True,
    )

    model = FastLanguageModel.get_peft_model(
        model,
        r=args.lora_r,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                         "gate_proj", "up_proj", "down_proj"],
        lora_alpha=args.lora_r * 2,
        lora_dropout=0,
        bias="none",
        use_gradient_checkpointing="unsloth",
        random_state=3407,
    )

    chat_template = args.chat_template or infer_chat_template(args.base_model)
    print(f"Using chat template: {chat_template}")
    tokenizer = get_chat_template(tokenizer, chat_template=chat_template)

    data_files = {
        "train": str(args.dataset / "train.jsonl"),
        "validation": str(args.dataset / "val.jsonl"),
    }
    dataset = load_dataset("json", data_files=data_files)

    def formatting_func(examples):
        texts = [
            tokenizer.apply_chat_template(m, tokenize=False, add_generation_prompt=False)
            for m in examples["messages"]
        ]
        return {"text": texts}

    dataset = dataset.map(formatting_func, batched=True)

    args.out.mkdir(parents=True, exist_ok=True)

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset["train"],
        eval_dataset=dataset["validation"],
        dataset_text_field="text",
        max_seq_length=args.max_seq_length,
        args=SFTConfig(
            per_device_train_batch_size=args.batch_size,
            gradient_accumulation_steps=args.grad_accum,
            num_train_epochs=args.epochs,
            learning_rate=args.learning_rate,
            fp16=not is_bfloat16_supported(),
            bf16=is_bfloat16_supported(),
            logging_steps=1,
            eval_strategy="epoch",
            optim="adamw_8bit",
            output_dir=str(args.out / "checkpoints"),
            save_strategy="epoch",
            report_to="none",
        ),
    )

    print("Starting training...")
    trainer.train()

    model.save_pretrained(str(args.out))
    tokenizer.save_pretrained(str(args.out))
    print(f"Adapter saved to {args.out}. Next: python evaluate.py --base-model "
          f"{args.base_model} --adapter {args.out} --dataset {args.dataset}/val.jsonl")


if __name__ == "__main__":
    main()
