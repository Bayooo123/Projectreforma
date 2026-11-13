#!/usr/bin/env bash
# Merges a fine-tuned LoRA adapter into its base model, exports GGUF, and
# registers it with Ollama so it can be served locally.
#
# Usage: ./export_to_ollama.sh <adapter-dir> <ollama-model-name>
# Example: ./export_to_ollama.sh adapters/greenbridge-v1 greenbridge-draft-v1

set -euo pipefail

ADAPTER_DIR="${1:?Usage: ./export_to_ollama.sh <adapter-dir> <ollama-model-name>}"
MODEL_NAME="${2:?Usage: ./export_to_ollama.sh <adapter-dir> <ollama-model-name>}"
GGUF_DIR="gguf/${MODEL_NAME}"

if ! command -v ollama &> /dev/null; then
  echo "ollama not found. Install it first: https://ollama.com/download" >&2
  exit 1
fi

echo "== Merging adapter and exporting GGUF =="
python merge_and_export_gguf.py --adapter "${ADAPTER_DIR}" --out "${GGUF_DIR}"

GGUF_FILE=$(find "${GGUF_DIR}" -maxdepth 1 -name '*.gguf' | head -n 1)
if [ -z "${GGUF_FILE}" ]; then
  echo "No .gguf file found under ${GGUF_DIR} — export must have failed." >&2
  exit 1
fi

MODELFILE="${GGUF_DIR}/Modelfile"
sed "s|{{GGUF_PATH}}|$(realpath "${GGUF_FILE}")|" Modelfile.template > "${MODELFILE}"

echo "== Registering with Ollama as '${MODEL_NAME}' =="
ollama create "${MODEL_NAME}" -f "${MODELFILE}"

echo ""
echo "Done. Serve it locally with: ollama run ${MODEL_NAME}"
echo "No internet connection is required for inference from this point on."
