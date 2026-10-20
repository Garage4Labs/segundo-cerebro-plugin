#!/usr/bin/env node
// Monta o segundo cérebro num projeto. Nunca sobrescreve arquivo que já existe; pode rodar de novo sem medo.
//   node criar.mjs [--dir <projeto>] [--pasta segundo-cerebro] [--nome "Minha Empresa"]
//                  [--publicar push|commit|nao] [--fichas app,site]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PLUGIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODELO = path.join(PLUGIN, 'modelo');
const INICIO = '<!-- segundo-cerebro:inicio -->';
const FIM = '<!-- segundo-cerebro:fim -->';

const argv = process.argv.slice(2);
const opcao = (nome, padrao) => { const i = argv.indexOf(`--${nome}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : padrao; };
const dir = path.resolve(opcao('dir', process.cwd()));
const configPath = path.join(dir, '.segundo-cerebro.json');
const anterior = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};

const pasta = opcao('pasta', anterior.pasta || 'segundo-cerebro').replace(/\\/g, '/').replace(/\/+$/, '');
const publicar = opcao('publicar', anterior.publicar || 'push');
if (!['push', 'commit', 'nao'].includes(publicar)) { console.error('--publicar aceita push, commit ou nao'); process.exit(1); }
const fichasArg = opcao('fichas', null);
const pastasComFicha = fichasArg !== null ? fichasArg.split(',').map((s) => s.trim()).filter(Boolean) : (anterior.pastasComFicha || []);
const nome = opcao('nome', 'este projeto');
const hoje = new Date().toISOString().slice(0, 10);
const trocar = (t) => t.replaceAll('{{PASTA}}', pasta).replaceAll('{{NOME}}', nome).replaceAll('{{DATA}}', hoje);

const criados = [];
const mantidos = [];

// 1. pastas e modelos
function copiar(origem, destino) {
  for (const e of fs.readdirSync(origem, { withFileTypes: true })) {
    const o = path.join(origem, e.name);
    const d = path.join(destino, e.name);
    if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copiar(o, d); continue; }
    const rel = path.relative(dir, d).replace(/\\/g, '/');
    if (fs.existsSync(d)) { mantidos.push(rel); continue; }
    fs.writeFileSync(d, trocar(fs.readFileSync(o, 'utf8')));
    criados.push(rel);
  }
}
fs.mkdirSync(path.join(dir, pasta), { recursive: true });
copiar(path.join(MODELO, 'cerebro'), path.join(dir, pasta));

// 2. configuração lida pelo hook
const config = { ...anterior, pasta, publicar, pastasComFicha, ignorar: anterior.ignorar || [] };
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
(Object.keys(anterior).length ? mantidos : criados).push('.segundo-cerebro.json');

// 3. instruções no CLAUDE.md (Claude Code) e no AGENTS.md (Codex, Cursor, Hermes), entre marcadores
function instruir(arquivo) {
  const alvo = path.join(dir, arquivo);
  const bloco = `${INICIO}\n${trocar(fs.readFileSync(path.join(MODELO, 'instrucoes.md'), 'utf8')).trim()}\n${FIM}`;
  const atual = fs.existsSync(alvo) ? fs.readFileSync(alvo, 'utf8') : '';
  const i = atual.indexOf(INICIO);
  const j = atual.indexOf(FIM);
  const novo = i >= 0 && j > i ? atual.slice(0, i) + bloco + atual.slice(j + FIM.length)
    : `${atual}${atual && !atual.endsWith('\n\n') ? (atual.endsWith('\n') ? '\n' : '\n\n') : ''}${bloco}\n`;
  if (novo !== atual) { fs.writeFileSync(alvo, novo); criados.push(`${arquivo} (bloco do segundo cérebro)`); }
  else mantidos.push(arquivo);
}
instruir('CLAUDE.md');
instruir('AGENTS.md');

const git = fs.existsSync(path.join(dir, '.git'));
console.log(JSON.stringify({ projeto: dir, pasta, publicar, pastasComFicha, git, criados, mantidos }, null, 2));
