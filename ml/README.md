# Local model pipeline

Fine-tunes an open-weight model on Greenbridge/ASCOLP's own house style —
not on case law or authorities, which is a retrieval problem (see "Why not
train on case law" below), but on *how the firm actually writes once a
lawyer has edited an AI draft*. Runs entirely on a laptop with a 16GB+ VRAM
GPU — no cloud account required for this part.

## The data

`src/app/api/admin/export-training-data/route.ts` (in the main app) exports
every **sent** `ClientUpdateDraft` as a `{context, draftText, finalText}`
triple — `finalText` is what the lawyer actually sent, after any edits.
That's the training signal: (context the AI was given) → (what the firm
actually sends). Fetch it from a running deployment:

```bash
curl "https://<your-deployment>/api/admin/export-training-data?workspaceId=<id>" \
  -H "Cookie: <your session cookie>" \
  -o raw_export.jsonl
```

You need to be logged in as a platform admin — the endpoint is gated with
`requirePlatformAdmin()`.

**Expect very few rows at first.** Only the `/first-draft` web approval flow
captures a real edited `finalText` today (the WhatsApp auto-send paths send
`draftText` as-is, so there's no edit signal there yet). Volume grows as
lawyers use `/first-draft` to review and tweak before sending. Fine-tuning
below is safe to skip until there are at least ~50-100 rows with
`"edited": true` — below that, LoRA will overfit to noise. Check with:

```bash
python3 -c "
import json
rows = [json.loads(l) for l in open('raw_export.jsonl') if l.strip()]
edited = [r for r in rows if r['edited']]
print(f'{len(rows)} total, {len(edited)} actually edited')
"
```

## Setup (on the GPU laptop, not this sandbox)

```bash
cd ml
python3 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Requires an NVIDIA GPU with CUDA and 16GB+ VRAM. Confirm with `nvidia-smi`
before continuing — if that command isn't found, install the NVIDIA driver
first.

## 1. Prepare the dataset

```bash
python prepare_dataset.py raw_export.jsonl --out dataset/
```

Produces `dataset/train.jsonl` and `dataset/val.jsonl` (90/10 split),
formatted as chat-style instruction pairs. Only rows where `edited: true`
are kept by default — pass `--include-unedited` to also keep confirmed
drafts as positive (no-change) examples once you have enough edited rows
to not be drowned out by them.

## 2. Fine-tune

```bash
python finetune.py --base-model unsloth/Qwen2.5-7B-Instruct-bnb-4bit \
  --dataset dataset/ --out adapters/greenbridge-v1
```

Uses [Unsloth](https://github.com/unslothai/unsloth) for QLoRA (4-bit,
LoRA adapters only — not a full fine-tune, which is why this fits on a
laptop GPU). Defaults: 3 epochs, LoRA rank 16, batch size 2 with gradient
accumulation 4. A 7B model with a few hundred rows takes roughly 20-40
minutes on a 16GB laptop GPU. Adjust `--base-model` to
`unsloth/Meta-Llama-3.1-8B-Instruct-bnb-4bit` if you'd rather start there —
both are reasonable; Qwen2.5 tends to follow structured-writing
instructions slightly better in practice.

## 3. Evaluate before trusting it

```bash
python evaluate.py --base-model unsloth/Qwen2.5-7B-Instruct-bnb-4bit \
  --adapter adapters/greenbridge-v1 --dataset dataset/val.jsonl
```

Prints base-model output vs fine-tuned output side by side for each
held-out example. This is not pass/fail automated grading — a lawyer needs
to actually read the outputs and judge whether the fine-tuned version
reads more like the firm's own letters. Don't ship an adapter nobody has
reviewed.

## 4. Export for serving (Ollama)

```bash
./export_to_ollama.sh adapters/greenbridge-v1 greenbridge-draft-v1
```

Merges the LoRA adapter into the base weights, converts to GGUF (4-bit
quantized), and creates an Ollama model from `Modelfile`. After this:

```bash
ollama run greenbridge-draft-v1
```

serves it locally, no internet required for inference.

## Why not train on case law / authorities

Fine-tuning changes *how* a model writes, not *what it knows* reliably — a
7B model fine-tuned on scanned judgments will still hallucinate citations,
and it goes stale the moment a new judgment is reported. Authority Search
needs **retrieval**, not training: a periodically-refreshed local corpus
(licensed case-law text, re-synced weekly/monthly, not queried live per
request) that the model searches at request time and cites from directly.
That's a separate RAG pipeline, not this fine-tuning pipeline — see the
main app's `src/lib/drafting/` for the existing retrieval pattern this
would extend. If a live external lookup is ever needed for very recent
judgments, the outbound query must be scrubbed to the abstract legal issue
only — never party names, client identity, or case facts.

## Why not a full fine-tune / training a model from scratch

A capable model "from scratch" is a different order of project — data
licensing, large-scale compute, evaluation infrastructure — realistically
months and well beyond a single grant cycle's budget. LoRA fine-tuning an
existing strong open-weight model, as this pipeline does, is the
achievable version of "a model that writes like us, that we control."
