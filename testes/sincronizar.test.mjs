// node --test testes/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const PLUGIN = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CRIAR = path.join(PLUGIN, 'scripts', 'criar.mjs');
const SINC = path.join(PLUGIN, 'scripts', 'sincronizar.mjs');

function projeto({ remoto = true, publicar = 'push', fichas = '' } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cerebro-'));
  const dir = path.join(base, 'proj');
  fs.mkdirSync(dir);
  const g = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' }).trim();
  g('init', '-q', '-b', 'main');
  g('config', 'user.name', 'Teste');
  g('config', 'user.email', 'teste@exemplo.com');
  g('config', 'core.autocrlf', 'false');
  if (remoto) {
    execFileSync('git', ['init', '-q', '--bare', '-b', 'main', path.join(base, 'remoto.git')]);
    g('remote', 'add', 'origin', path.join(base, 'remoto.git'));
  }
  execFileSync('node', [CRIAR, '--dir', dir, '--nome', 'Acme', '--publicar', publicar, '--fichas', fichas]);
  return { dir, base, g };
}
// roda o hook Stop como o Claude Code roda: JSON no stdin, saída JSON no stdout
function stop(dir, segundaVolta = false) {
  const r = spawnSync('node', [SINC], { input: JSON.stringify({ cwd: dir, stop_hook_active: segundaVolta }), encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: '' } });
  return r.stdout.trim() ? JSON.parse(r.stdout) : {};
}
const escrever = (dir, f, t) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), t); };
const logar = (dir, t) => fs.appendFileSync(path.join(dir, 'segundo-cerebro/memoria/log.md'), `- 2026-01-01 — ${t}\n`);

test('criar monta a pasta, a configuração e o bloco no CLAUDE.md, sem sobrescrever', () => {
  const { dir } = projeto();
  for (const f of ['contexto/quem-somos.md', 'projetos/_modelo.md', 'memoria/decisoes.md', '00-inbox/.gitkeep']) {
    assert.ok(fs.existsSync(path.join(dir, 'segundo-cerebro', f)), f);
  }
  assert.match(fs.readFileSync(path.join(dir, 'segundo-cerebro/contexto/quem-somos.md'), 'utf8'), /\*\*Nome:\*\* Acme/);
  const claude = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.match(claude, /segundo-cerebro\/memoria\/log\.md/);
  escrever(dir, 'segundo-cerebro/contexto/quem-somos.md', 'meu texto');
  escrever(dir, 'CLAUDE.md', `# Meu projeto\n\n${claude}\nfim\n`);
  execFileSync('node', [CRIAR, '--dir', dir, '--pasta', 'segundo-cerebro']);
  assert.equal(fs.readFileSync(path.join(dir, 'segundo-cerebro/contexto/quem-somos.md'), 'utf8'), 'meu texto');
  const depois = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8');
  assert.equal(depois.split('segundo-cerebro:inicio').length, 2, 'bloco não duplica');
  assert.match(depois, /^# Meu projeto/);
  assert.match(depois, /fim\n$/);
});

test('fora de um projeto com cérebro, o hook não faz nada', () => {
  const vazio = fs.mkdtempSync(path.join(os.tmpdir(), 'sem-cerebro-'));
  assert.deepEqual(stop(vazio), {});
});

test('trabalho sem linha no log bloqueia; com log, publica no remoto', () => {
  const { dir, g } = projeto();
  let r = stop(dir);
  assert.match(r.systemMessage, /publicado em origin\/main/);
  escrever(dir, 'app/index.js', 'console.log(1)\n');
  r = stop(dir);
  assert.equal(r.decision, 'block');
  assert.match(r.reason, /sem linha nova em segundo-cerebro\/memoria\/log\.md/);
  logar(dir, 'app criado');
  r = stop(dir);
  assert.match(r.systemMessage, /commit .* publicado/);
  assert.equal(g('status', '--porcelain'), '');
  assert.equal(g('rev-parse', 'HEAD'), g('rev-parse', 'origin/main'));
  assert.deepEqual(stop(dir), {}, 'nada novo: silêncio');
});

test('mudança só no cérebro não exige log', () => {
  const { dir } = projeto();
  stop(dir);
  escrever(dir, 'segundo-cerebro/00-inbox/ideia.md', 'uma ideia');
  assert.match(stop(dir).systemMessage, /publicado/);
});

test('na segunda volta o hook não bloqueia de novo, mas publica e registra o problema', () => {
  const { dir } = projeto();
  stop(dir);
  escrever(dir, 'notas.txt', 'x');
  const r = stop(dir, true);
  assert.equal(r.decision, undefined);
  assert.match(r.systemMessage, /⚠️/);
  const st = spawnSync('node', [SINC, '--status'], { input: JSON.stringify({ cwd: dir }), encoding: 'utf8' });
  const s = JSON.parse(st.stdout);
  assert.match(s.systemMessage, /falhou/);
  assert.match(s.hookSpecificOutput.additionalContext, /Antes de uma tarefa, leia/);
});

test('pasta exigida sem ficha bloqueia até ganhar ficha', () => {
  const { dir } = projeto({ fichas: 'app' });
  escrever(dir, 'app/loja/x.js', '1');
  logar(dir, 'loja');
  assert.match(stop(dir).reason, /`app\/loja\/` não aparece em nenhuma ficha/);
  escrever(dir, 'segundo-cerebro/projetos/loja.md', '# Loja\n- **Pasta do código/arquivos:** app/loja\n');
  assert.match(stop(dir).systemMessage, /publicado/);
});

test('chave de API no que vai ser publicado impede o commit', () => {
  const { dir, g } = projeto();
  stop(dir);
  escrever(dir, 'config.env', `OPENAI_API_KEY=sk-${'a1B2c3D4'.repeat(5)}\n`);
  logar(dir, 'config');
  const r = stop(dir);
  assert.match(r.systemMessage, /possível chave ou senha em config\.env/);
  assert.match(g('status', '--porcelain'), /config\.env/, 'nada foi commitado');
});

test('sem remoto, fica no commit local; com publicar=nao, não toca no git', () => {
  const a = projeto({ remoto: false });
  assert.match(stop(a.dir).systemMessage, /sem remoto configurado/);
  const b = projeto({ remoto: false, publicar: 'nao' });
  escrever(b.dir, 'x.txt', '1');
  logar(b.dir, 'x');
  assert.deepEqual(stop(b.dir), {});
  assert.equal(b.g('rev-list', '--all').length, 0, 'nenhum commit');
});

test('traz o que outra máquina publicou antes de publicar', () => {
  const { dir, base } = projeto();
  stop(dir);
  const outra = path.join(base, 'outra');
  execFileSync('git', ['clone', '-q', path.join(base, 'remoto.git'), outra]);
  const o = (...a) => execFileSync('git', a, { cwd: outra, encoding: 'utf8' });
  o('config', 'user.name', 'Outra'); o('config', 'user.email', 'o@exemplo.com');
  escrever(outra, 'segundo-cerebro/recursos/artigo.md', 'artigo');
  o('add', '-A'); o('commit', '-q', '-m', 'outra máquina'); o('push', '-q');
  escrever(dir, 'segundo-cerebro/00-inbox/nota.md', 'nota');
  assert.match(stop(dir).systemMessage, /publicado/);
  assert.ok(fs.existsSync(path.join(dir, 'segundo-cerebro/recursos/artigo.md')));
});
