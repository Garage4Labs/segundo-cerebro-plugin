#!/usr/bin/env bash
# Instala o segundo cérebro para Cursor e Hermes (Claude Code e Codex usam o plugin; veja o README).
#   curl -fsSL https://raw.githubusercontent.com/Garage4Labs/segundo-cerebro-plugin/main/instalar.sh | bash
#   ... | bash -s -- --agentes cursor        escolhe o agente
#   ... | bash -s -- --remover               desfaz
set -euo pipefail
DESTINO="${SEGUNDO_CEREBRO_DIR:-$HOME/.segundo-cerebro}"
REPO="https://github.com/Garage4Labs/segundo-cerebro-plugin.git"
command -v git >/dev/null || { echo "Instale o git primeiro."; exit 1; }
command -v node >/dev/null || { echo "Instale o Node.js 18+ primeiro."; exit 1; }
if [ -d "$DESTINO/.git" ]; then git -C "$DESTINO" pull -q --ff-only; else git clone -q "$REPO" "$DESTINO"; fi
node "$DESTINO/scripts/instalar.mjs" "$@"
