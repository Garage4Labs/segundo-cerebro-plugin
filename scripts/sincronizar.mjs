#!/usr/bin/env node
// Confere e publica o segundo cérebro do projeto. Só age onde existe .segundo-cerebro.json
// (criado pela skill criar-cerebro); nos outros projetos sai em silêncio.
//   node sincronizar.mjs            hook Stop: confere, faz commit e push (lê o JSON do hook no stdin)
//   node sincronizar.mjs --status   hook SessionStart: lembra a rotina e avisa se a última sincronização falhou
//   node sincronizar.mjs --manual   o mesmo que o hook Stop, com saída em texto (terminal ou agentes sem hooks)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const CONFIG = '.segundo-cerebro.json';
const PADRAO = { pasta: 'segundo-cerebro', publicar: 'push', pastasComFicha: [], ignorar: [] };
// padrões de segredo: chaves com cara de aleatórias, nunca exemplos curtos
const SEGREDOS = [
  /\bsk-[A-Za-z0-9_-]{24,}/, /\bAKIA[0-9A-Z]{16}\b/, /\bgh[pousr]_[A-Za-z0-9]{30,}/, /\bgithub_pat_[A-Za-z0-9_]{40,}/,
  /\bxox[abprs]-[A-Za-z0-9-]{20,}/, /\bAIza[0-9A-Za-z_-]{35}\b/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b[A-Z_]*(API_KEY|SECRET|TOKEN|PASSWORD)\s*[=:]\s*['"]?[A-Za-z0-9_\-/+]{24,}/,
];

const args = new Set(process.argv.slice(2));
let hook = {};
if (!args.has('--manual')) { try { hook = JSON.parse(fs.readFileSync(0, 'utf8') || '{}'); } catch { hook = {}; } }

// raiz do projeto: a pasta que tem .segundo-cerebro.json, subindo a partir de onde o Claude está
function acharRaiz(inicio) {
  for (let d = path.resolve(inicio); ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, CONFIG))) return d;
    if (path.dirname(d) === d) return null;
  }
}
const ROOT = acharRaiz(process.env.CLAUDE_PROJECT_DIR || hook.cwd || process.cwd());
if (!ROOT) {
  if (args.has('--manual')) console.log(`Nenhum ${CONFIG} encontrado: rode a skill criar-cerebro neste projeto primeiro.`);
  process.exit(0);
}

let cfg;
try { cfg = { ...PADRAO, ...JSON.parse(fs.readFileSync(path.join(ROOT, CONFIG), 'utf8')) }; }
catch (e) { cfg = { ...PADRAO, invalido: e.message }; }
const PASTA = cfg.pasta.replace(/\\/g, '/').replace(/\/+$/, '');
const LOG = `${PASTA}/memoria/log.md`;

const run = (cmd, a, opts = {}) => execFileSync(cmd, a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
const git = (...a) => run('git', a);
const tryGit = (...a) => { try { return git(...a); } catch { return null; } };
const erro = (e) => String(e.stderr || e.message || e).trim().split('\n').slice(-3).join(' ');

const gitDir = tryGit('rev-parse', '--absolute-git-dir');
const STATE_FILE = gitDir ? path.join(gitDir, 'segundo-cerebro.json') : path.join(ROOT, '.claude', 'segundo-cerebro.estado.json');
const lerEstado = () => { try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return {}; } };
const gravarEstado = (s) => { fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); };

// ---------- --status (SessionStart) ----------
if (args.has('--status')) {
  const rotina = `Este projeto tem um segundo cérebro em \`${PASTA}/\`. Antes de uma tarefa, leia \`${PASTA}/contexto/\`, ` +
    `a ficha do projeto em \`${PASTA}/projetos/\` e \`${PASTA}/memoria/decisoes.md\`. Depois de uma tarefa relevante, registre uma linha em ` +
    `\`${LOG}\` e, se houver, a decisão (com o porquê) em \`decisoes.md\` e o aprendizado em \`aprendizados.md\`. ` +
    'Ao fim de cada resposta, o hook do plugin segundo-cerebro confere a memória e publica; se ele bloquear, corrija o que pedir.';
  const u = lerEstado().ultimo;
  const quando = u && new Date(u.quando).toLocaleString('pt-BR');
  const falhou = u && !u.ok;
  console.log(JSON.stringify({
    ...(u ? { systemMessage: falhou ? `⚠️ A última sincronização do segundo cérebro (${quando}) falhou: ${u.problemas.join(' · ')}`
      : `✅ Segundo cérebro sincronizado em ${quando}${u.commit ? ` (${u.commit})` : ''}.` } : {}),
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: rotina + (falhou
      ? ` A última sincronização falhou (${quando}): ${u.problemas.join(' | ')}. Antes de outra tarefa, resolva o problema ` +
        'e conte ao usuário em uma linha; a próxima resposta sincroniza de novo.' : '') },
  }));
  process.exit(0);
}

const segundaVolta = Boolean(hook.stop_hook_active);
const estado = lerEstado();
const corrigir = []; // o Claude consegue resolver: o hook o obriga a resolver antes de encerrar
const falhas = []; // infraestrutura (rede, permissão): vira aviso no início da próxima sessão
const feito = [];

function terminar() {
  const ok = !corrigir.length && !falhas.length;
  estado.ultimo = { quando: new Date().toISOString(), ok, commit: tryGit('rev-parse', '--short', 'HEAD'), problemas: [...corrigir, ...falhas], feito };
  gravarEstado(estado);
  const resumo = ok ? (feito.length ? `✅ Segundo cérebro: ${feito.join(' · ')}` : '')
    : `⚠️ Segundo cérebro: ${[...corrigir, ...falhas].join(' · ')}${feito.length ? ` (feito: ${feito.join(' · ')})` : ''}`;
  if (args.has('--manual')) { console.log(resumo || '✅ Nada a publicar: tudo em dia.'); process.exit(ok ? 0 : 1); }
  if (corrigir.length && !segundaVolta) {
    console.log(JSON.stringify({ decision: 'block', reason:
      `Segundo cérebro: corrija antes de encerrar (a publicação acontece sozinha depois):\n- ${corrigir.join('\n- ')}` }));
  } else if (resumo) console.log(JSON.stringify({ systemMessage: resumo }));
  process.exit(0);
}

// qualquer erro inesperado vira falha registrada (aviso na próxima sessão), nunca um silêncio
process.on('uncaughtException', (e) => { falhas.push(`erro inesperado: ${erro(e)}`); terminar(); });

if (cfg.invalido) { corrigir.push(`${CONFIG} não é um JSON válido: ${cfg.invalido}`); terminar(); }
if (!fs.existsSync(path.join(ROOT, PASTA))) { corrigir.push(`a pasta \`${PASTA}/\` indicada em ${CONFIG} não existe`); terminar(); }

// ---------- 1. conferências da memória ----------
const projetos = path.join(ROOT, PASTA, 'projetos');
const fichas = fs.existsSync(projetos) ? fs.readdirSync(projetos).filter((f) => f.endsWith('.md'))
  .map((f) => fs.readFileSync(path.join(projetos, f), 'utf8')).join('\n') : '';
for (const base of cfg.pastasComFicha) {
  const dir = path.join(ROOT, base);
  if (!fs.existsSync(dir)) continue;
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    if (d.isDirectory() && !d.name.startsWith('.') && !fichas.includes(`${base}/${d.name}`)) {
      corrigir.push(`\`${base}/${d.name}/\` não aparece em nenhuma ficha de ${PASTA}/projetos/ (crie uma a partir de _modelo.md)`);
    }
  }
}

if (!gitDir) {
  // sem git não há como saber o que mudou nem publicar: só as conferências acima
  if (cfg.publicar !== 'nao') falhas.push('o projeto não é um repositório git: rode git init (e conecte um remoto) para ter histórico e backup');
  terminar();
}

if (['rebase-merge', 'rebase-apply', 'MERGE_HEAD'].some((f) => fs.existsSync(path.join(gitDir, f)))) {
  corrigir.push('há um rebase ou merge pela metade: termine (git status) antes de publicar');
  terminar();
}
const branch = tryGit('symbolic-ref', '--short', 'HEAD');
if (!branch) { corrigir.push('HEAD destacado: volte para uma branch antes de publicar'); terminar(); }

const marcadores = tryGit('grep', '--untracked', '-l', '-E', '^(<<<<<<<|>>>>>>>) ', '--', PASTA, 'CLAUDE.md', 'AGENTS.md');
if (marcadores) corrigir.push(`marcadores de conflito em: ${marcadores.split('\n').join(', ')}`);

// o que mudou desde a última conferência (commits, alterações e arquivos novos)
const upstream = tryGit('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}');
const desde = estado.ultimoConferido && tryGit('merge-base', '--is-ancestor', estado.ultimoConferido, 'HEAD') !== null
  ? estado.ultimoConferido : (upstream || (tryGit('rev-parse', '--verify', '-q', 'HEAD') ? 'HEAD' : null));
const mudou = new Set([
  ...(desde ? (tryGit('diff', '--name-only', desde) || '').split('\n') : []),
  ...(tryGit('ls-files', '--others', '--exclude-standard') || '').split('\n'),
].filter(Boolean));
const fora = [`${PASTA}/`, '.claude/', CONFIG, ...cfg.ignorar];
const trabalho = [...mudou].filter((f) => !fora.some((p) => f === p || f.startsWith(p.endsWith('/') ? p : `${p}/`)));
if (trabalho.length && !mudou.has(LOG)) {
  const areas = [...new Set(trabalho.map((f) => f.split('/').slice(0, 2).join('/')))].slice(0, 5);
  corrigir.push(`houve trabalho em ${areas.join(', ')} sem linha nova em ${LOG}: registre o que foi feito (e decisões/aprendizados, se houver). ` +
    `Se a mudança não veio desta conversa, registre assim mesmo o que mudou, sem inventar o motivo; se não deve ser publicada, ponha no .gitignore ou em "ignorar" no ${CONFIG}`);
}

if (corrigir.length && !segundaVolta) terminar();

// ---------- 2. commit, com busca de segredos ----------
if (cfg.publicar !== 'nao') {
  git('add', '-A');
  const novo = tryGit('diff', '--cached', '--name-only');
  if (novo) {
    let arquivo = '';
    const comSegredo = new Set();
    for (const l of git('diff', '--cached', '-U0', '--no-color').split('\n')) {
      if (l.startsWith('+++ b/')) arquivo = l.slice(6);
      else if (l.startsWith('+') && !l.startsWith('+++') && SEGREDOS.some((r) => r.test(l))) comSegredo.add(arquivo);
    }
    if (comSegredo.size) {
      git('reset', '-q');
      falhas.push(`possível chave ou senha em ${[...comSegredo].join(', ')}: nada foi publicado. Tire o segredo do arquivo (use variável de ambiente ou um arquivo no .gitignore)`);
      terminar();
    }
    if (!tryGit('config', 'user.email')) {
      git('reset', '-q');
      falhas.push('o git não sabe quem é o autor: rode git config --global user.name "Seu Nome" e git config --global user.email voce@exemplo.com');
      terminar();
    }
    const areas = [...new Set(novo.split('\n').map((f) => f.split('/')[0]))].slice(0, 6).join(', ');
    git('commit', '-q', '-m', `Segundo cérebro: sincronização automática (${areas})`);
    feito.push(`commit ${git('rev-parse', '--short', 'HEAD')}`);
  }
}

// ---------- 3. traz o que está no remoto e publica ----------
const remoto = cfg.publicar === 'push' && (tryGit('config', `branch.${branch}.remote`) || ((tryGit('remote') || '').split('\n').includes('origin') ? 'origin' : null));
if (remoto) {
  let temBranch;
  try { temBranch = Boolean(git('ls-remote', '--heads', remoto, branch)); }
  catch (e) { falhas.push(`sem acesso ao remoto ${remoto}: ${erro(e)}`); terminar(); }
  if (temBranch) {
    try { git('fetch', '-q', remoto, branch); } catch (e) { falhas.push(`fetch falhou: ${erro(e)}`); terminar(); }
    try {
      git('rebase', '--autostash', '-q', `${remoto}/${branch}`);
    } catch (e) {
      tryGit('rebase', '--abort');
      corrigir.push(`o remoto tem mudanças que conflitam com as locais (${erro(e)}). Rode git pull --rebase ${remoto} ${branch}, ` +
        'resolva mantendo os dois lados (em log e decisões, costuma ser só manter todas as linhas) e publique');
      terminar();
    }
  }
  const aFrente = temBranch ? tryGit('rev-list', '--count', `${remoto}/${branch}..HEAD`) : tryGit('rev-list', '--count', 'HEAD');
  if (aFrente && aFrente !== '0') {
    try {
      git('push', '-q', ...(temBranch ? [] : ['-u']), remoto, `HEAD:${branch}`);
      feito.push(`publicado em ${remoto}/${branch} (${git('rev-parse', '--short', 'HEAD')})`);
    } catch (e) { falhas.push(`push recusado: ${erro(e)}`); terminar(); }
  }
} else if (cfg.publicar === 'push' && feito.length) {
  feito.push('sem remoto configurado: ficou só no commit local (git remote add origin <url> para ter backup)');
}

estado.ultimoConferido = tryGit('rev-parse', 'HEAD');
terminar();
