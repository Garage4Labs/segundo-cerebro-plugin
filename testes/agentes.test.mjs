// Formatos de hook de cada agente e o instalador para Cursor e Hermes. node --test testes/
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
const INSTALAR = path.join(PLUGIN, 'scripts', 'instalar.mjs');
const env = { ...process.env, CLAUDE_PROJECT_DIR: '', CURSOR_PROJECT_DIR: '' };

function projeto() {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'agentes-')), 'proj');
  fs.mkdirSync(dir);
  const g = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' }).trim();
  g('init', '-q', '-b', 'main');
  g('config', 'user.name', 'Teste');
  g('config', 'user.email', 'teste@exemplo.com');
  execFileSync('node', [CRIAR, '--dir', dir, '--nome', 'Acme', '--publicar', 'commit']);
  return { dir, g };
}
const hook = (payload) => {
  const r = spawnSync('node', [SINC], { input: JSON.stringify(payload), encoding: 'utf8', env });
  return r.stdout.trim() ? JSON.parse(r.stdout) : null;
};
const trabalho = (dir) => fs.writeFileSync(path.join(dir, 'app.py'), `x = ${Math.random()}\n`);

test('criar escreve o mesmo bloco no CLAUDE.md e no AGENTS.md', () => {
  const { dir } = projeto();
  const bloco = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
  assert.match(bloco('AGENTS.md'), /segundo-cerebro\/memoria\/log\.md/);
  assert.equal(bloco('AGENTS.md'), bloco('CLAUDE.md'));
});

test('Cursor: stop pede correção com followup_message, uma vez só, e sessionStart usa additional_context', () => {
  const { dir, g } = projeto();
  hook({ hook_event_name: 'stop', workspace_roots: [dir], loop_count: 0, status: 'completed' });
  trabalho(dir);
  const r = hook({ hook_event_name: 'stop', workspace_roots: [dir], loop_count: 0, status: 'completed' });
  assert.match(r.followup_message, /sem linha nova em segundo-cerebro\/memoria\/log\.md/);
  assert.equal(r.decision, undefined);
  assert.deepEqual(hook({ hook_event_name: 'stop', workspace_roots: [dir], loop_count: 1, status: 'completed' }), {});
  assert.equal(g('status', '--porcelain'), '', 'na segunda volta publica');
  const s = hook({ hook_event_name: 'sessionStart', workspace_roots: [dir], session_id: 'x' });
  assert.match(s.additional_context, /A última sincronização falhou/);
});

test('Hermes: pre_verify só confere e bloqueia; post_llm_call publica sem bloquear', () => {
  const { dir, g } = projeto();
  const base = { cwd: dir, profile: 'default', session_id: 's1' };
  hook({ ...base, hook_event_name: 'post_llm_call', extra: {} });
  trabalho(dir);
  const antes = g('rev-parse', 'HEAD');
  const r = hook({ ...base, hook_event_name: 'pre_verify', extra: { attempt: 0, coding: true } });
  assert.equal(r.decision, 'block');
  assert.equal(g('rev-parse', 'HEAD'), antes, 'pre_verify não publica');
  assert.equal(hook({ ...base, hook_event_name: 'pre_verify', extra: { attempt: 1 } }), null, 'não insiste');
  assert.equal(hook({ ...base, hook_event_name: 'post_llm_call', extra: {} }), null);
  assert.notEqual(g('rev-parse', 'HEAD'), antes, 'post_llm_call publicou');
  const c = hook({ ...base, hook_event_name: 'pre_llm_call', extra: { is_first_turn: true } });
  assert.match(c.context, /falhou/);
  assert.equal(hook({ ...base, hook_event_name: 'pre_llm_call', extra: { is_first_turn: false } }), null);
});

test('Hermes: pre_verify sem pendência não diz nada e não mexe no estado', () => {
  const { dir } = projeto();
  const base = { cwd: dir, profile: 'default' };
  hook({ ...base, hook_event_name: 'post_llm_call', extra: {} });
  assert.equal(hook({ ...base, hook_event_name: 'pre_verify', extra: { attempt: 0 } }), null);
  assert.equal(hook({ ...base, hook_event_name: 'pre_llm_call', extra: { is_first_turn: true } }), null);
});

test('instalador: Cursor e Hermes recebem skills e hooks, preservando o que já existia, e --remover desfaz', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'home-'));
  const hermes = path.join(home, 'hermes');
  fs.mkdirSync(path.join(home, '.cursor'), { recursive: true });
  fs.writeFileSync(path.join(home, '.cursor', 'hooks.json'), JSON.stringify({ version: 1, hooks: { stop: [{ command: './meu.sh' }] } }));
  fs.mkdirSync(hermes);
  fs.writeFileSync(path.join(hermes, 'config.yaml'), 'model: x\n');
  const e = { ...process.env, HOME: home, USERPROFILE: home, HERMES_HOME: hermes };
  const rodar = (...a) => execFileSync('node', [INSTALAR, ...a], { env: e, encoding: 'utf8' });

  rodar();
  rodar(); // idempotente
  const cur = JSON.parse(fs.readFileSync(path.join(home, '.cursor', 'hooks.json'), 'utf8'));
  assert.equal(cur.hooks.stop.length, 2);
  assert.equal(cur.hooks.stop[0].command, './meu.sh');
  assert.match(cur.hooks.sessionStart[0].command, /sincronizar\.mjs" --status$/);
  const skill = fs.readFileSync(path.join(home, '.cursor', 'skills', 'segundo-cerebro-criar-cerebro', 'SKILL.md'), 'utf8');
  assert.match(skill, /^name: segundo-cerebro-criar-cerebro$/m);
  assert.doesNotMatch(skill, /\$\{CLAUDE_PLUGIN_ROOT\}/);
  const yaml = fs.readFileSync(path.join(hermes, 'config.yaml'), 'utf8');
  assert.match(yaml, /^model: x$/m);
  assert.equal(yaml.split('pre_verify:').length, 2, 'bloco não duplica');
  assert.ok(fs.existsSync(path.join(hermes, 'skills', 'segundo-cerebro', 'segundo-cerebro-registrar', 'SKILL.md')));

  rodar('--remover');
  const depois = JSON.parse(fs.readFileSync(path.join(home, '.cursor', 'hooks.json'), 'utf8'));
  assert.deepEqual(depois.hooks, { stop: [{ command: './meu.sh' }] });
  assert.equal(fs.readFileSync(path.join(hermes, 'config.yaml'), 'utf8').trim(), 'model: x');
  assert.ok(!fs.existsSync(path.join(home, '.cursor', 'skills', 'segundo-cerebro-criar-cerebro')));
  assert.ok(!fs.existsSync(path.join(hermes, 'skills', 'segundo-cerebro')));
});
