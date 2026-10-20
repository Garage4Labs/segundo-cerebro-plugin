# Instala o segundo cérebro para Cursor e Hermes (Claude Code e Codex usam o plugin; veja o README).
#   irm https://raw.githubusercontent.com/Garage4Labs/segundo-cerebro-plugin/main/instalar.ps1 | iex
# Para escolher o agente ou desfazer, defina antes: $env:SEGUNDO_CEREBRO_ARGS = '--agentes cursor' (ou '--remover')
$ErrorActionPreference = 'Stop'
$destino = if ($env:SEGUNDO_CEREBRO_DIR) { $env:SEGUNDO_CEREBRO_DIR } else { Join-Path $HOME '.segundo-cerebro' }
$repo = 'https://github.com/Garage4Labs/segundo-cerebro-plugin.git'
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Instale o git primeiro.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Instale o Node.js 18+ primeiro.' }
if (Test-Path (Join-Path $destino '.git')) { git -C $destino pull -q --ff-only } else { git clone -q $repo $destino }
$extra = if ($env:SEGUNDO_CEREBRO_ARGS) { $env:SEGUNDO_CEREBRO_ARGS -split ' ' } else { @() }
node (Join-Path $destino 'scripts/instalar.mjs') @extra
