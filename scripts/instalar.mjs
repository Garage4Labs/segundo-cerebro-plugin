#!/usr/bin/env node
// Liga o segundo cérebro em agentes que não usam o plugin do Claude Code: Cursor e Hermes.
// (Claude Code e Codex instalam o plugin direto do marketplace; veja o README.)
// Roda a partir de uma cópia do repositório, de preferência ~/.segundo-cerebro (instalar.sh e instalar.ps1 cuidam disso).
//   node instalar.mjs                          detecta Cursor e Hermes e instala no que encontrar
//   node instalar.mjs --agentes cursor,hermes  escolhe
//   node instalar.mjs --remover                desfaz
// Como no plugin, os hooks só agem em projetos com .segundo-cerebro.json.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MOTOR = path.join(RAIZ, 'scripts', 'sincronizar.mjs').replace(/\\/g, '/');
const PREFIXO = 'segundo-cerebro-';
const MARCA = '.segundo-cerebro'; // arquivo que marca as pastas de skill instaladas por aqui
const INICIO = '# segundo-cerebro:inicio';
const FIM = '# segundo-cerebro:fim';

const argv = process.argv.slice(2);
const opcao = (nome) => { const i = argv.indexOf(`--${nome}`); return i >= 0 ? argv[i + 1] : null; };
const remover = argv.includes('--remover');
const home = os.homedir();
const hermesHome = process.env.HERMES_HOME || (process.platform === 'win32'
  ? path.join(process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local'), 'hermes') : path.join(home, '.hermes'));
const cursorHome = path.join(home, '.cursor');

const detectados = [fs.existsSync(cursorHome) && 'cursor', fs.existsSync(hermesHome) && 'hermes'].filter(Boolean);
const agentes = opcao('agentes') ? opcao('agentes').split(',').map((s) => s.trim().toLowerCase()) : detectados;
const relatorio = [];

// skills: cópia com prefixo no nome (evita colidir com outras skills soltas) e caminho real do plugin no lugar da variável
function instalarSkills(destino) {
  fs.mkdirSync(destino, { recursive: true });
  for (const d of fs.readdirSync(destino)) {
    if (d.startsWith(PREFIXO) && fs.existsSync(path.join(destino, d, MARCA))) fs.rmSync(path.join(destino, d), { recursive: true, force: true });
  }
  if (remover) return [];
  const nomes = [];
  for (const skill of fs.readdirSync(path.join(RAIZ, 'skills'))) {
    const nome = PREFIXO + skill;
    const alvo = path.join(destino, nome);
    if (fs.existsSync(alvo)) { relatorio.push(`⚠️ ${alvo} já existe e não é desta instalação: mantido`); continue; }
    fs.mkdirSync(alvo, { recursive: true });
    const texto = fs.readFileSync(path.join(RAIZ, 'skills', skill, 'SKILL.md'), 'utf8')
      .replace(/^name: .*$/m, `name: ${nome}`).replaceAll('${CLAUDE_PLUGIN_ROOT}', RAIZ.replace(/\\/g, '/'));
    fs.writeFileSync(path.join(alvo, 'SKILL.md'), texto);
    fs.writeFileSync(path.join(alvo, MARCA), 'Instalada por segundo-cerebro/scripts/instalar.mjs. Não edite: é substituída a cada instalação.\n');
    nomes.push(nome);
  }
  return nomes;
}

function cursor() {
  // Cursor lê skills em ~/.cursor/skills (e em ~/.agents/skills, que o Codex também lê; por isso não usamos essa)
  const skills = instalarSkills(path.join(cursorHome, 'skills'));
  const arquivo = path.join(cursorHome, 'hooks.json');
  let cfg = { version: 1, hooks: {} };
  if (fs.existsSync(arquivo)) {
    try { cfg = JSON.parse(fs.readFileSync(arquivo, 'utf8')); } catch (e) { relatorio.push(`❌ Cursor: ${arquivo} não é JSON válido (${e.message}); corrija e rode de novo`); return; }
  }
  cfg.version ??= 1;
  cfg.hooks ??= {};
  for (const ev of Object.keys(cfg.hooks)) {
    cfg.hooks[ev] = cfg.hooks[ev].filter((h) => { const c = String(h.command || ''); return !c.includes(MOTOR) && !/segundo-cerebro.*sincronizar\.mjs/.test(c); });
    if (!cfg.hooks[ev].length) delete cfg.hooks[ev];
  }
  if (!remover) {
    (cfg.hooks.sessionStart ??= []).push({ command: `node "${MOTOR}" --status`, timeout: 30 });
    (cfg.hooks.stop ??= []).push({ command: `node "${MOTOR}"`, timeout: 300, loop_limit: 2 });
  }
  fs.mkdirSync(cursorHome, { recursive: true });
  fs.writeFileSync(arquivo, `${JSON.stringify(cfg, null, 2)}\n`);
  relatorio.push(remover ? `✅ Cursor: hooks e skills removidos` : `✅ Cursor: skills ${skills.join(', ')} em ${path.join(cursorHome, 'skills')}; hooks em ${arquivo}`);
}

function hermes() {
  const skills = instalarSkills(path.join(hermesHome, 'skills', 'segundo-cerebro'));
  if (remover) fs.rmSync(path.join(hermesHome, 'skills', 'segundo-cerebro'), { recursive: true, force: true });
  const arquivo = path.join(hermesHome, 'config.yaml');
  let texto = fs.existsSync(arquivo) ? fs.readFileSync(arquivo, 'utf8') : '';
  const i = texto.indexOf(INICIO);
  const j = texto.indexOf(FIM);
  if (i >= 0 && j > i) texto = texto.slice(0, i).replace(/\n+$/, '\n') + texto.slice(j + FIM.length).replace(/^\n+/, '\n');
  if (!remover) {
    if (/^hooks:/m.test(texto)) {
      relatorio.push(`⚠️ Hermes: ${arquivo} já tem um bloco hooks:. Acrescente dentro dele, à mão:\n` +
        `  pre_llm_call:  [{command: 'node "${MOTOR}"', timeout: 30}]\n  pre_verify:    [{command: 'node "${MOTOR}"', timeout: 60}]\n` +
        `  post_llm_call: [{command: 'node "${MOTOR}"', timeout: 300}]`);
    } else {
      const cmd = `'node "${MOTOR}"'`;
      texto = `${texto.replace(/\n*$/, '\n\n')}${INICIO}\n# Confere e publica o segundo cérebro (só em projetos com .segundo-cerebro.json).\nhooks:\n` +
        `  pre_llm_call:\n    - command: ${cmd}\n      timeout: 30\n` +
        `  pre_verify:\n    - command: ${cmd}\n      timeout: 60\n` +
        `  post_llm_call:\n    - command: ${cmd}\n      timeout: 300\n${FIM}\n`;
    }
  }
  fs.mkdirSync(hermesHome, { recursive: true });
  fs.writeFileSync(arquivo, texto);
  relatorio.push(remover ? '✅ Hermes: hooks e skills removidos'
    : `✅ Hermes: skills ${skills.join(', ')} em ${path.join(hermesHome, 'skills', 'segundo-cerebro')}; hooks em ${arquivo}. ` +
      'Na primeira sessão o Hermes pede para aprovar cada hook (ou use hermes --accept-hooks).');
}

if (!agentes.length) relatorio.push('Nenhum Cursor ou Hermes encontrado. Use --agentes cursor,hermes para instalar mesmo assim.');
for (const a of agentes) {
  if (a === 'cursor') cursor();
  else if (a === 'hermes') hermes();
  else if (a === 'claude' || a === 'codex') relatorio.push(`ℹ️ ${a}: instale pelo marketplace (veja o README); não precisa deste instalador.`);
  else relatorio.push(`❌ agente desconhecido: ${a} (use cursor ou hermes)`);
}
console.log(relatorio.join('\n'));
