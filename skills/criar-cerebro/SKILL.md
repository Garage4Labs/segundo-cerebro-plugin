---
name: criar-cerebro
description: Cria e configura um segundo cérebro (contexto, projetos e memória em Markdown) no projeto atual, com conferência e publicação automáticas no git. Use quando o usuário pedir para criar, instalar, montar, configurar ou começar a usar um segundo cérebro, uma base de conhecimento ou memória do projeto para o Claude, ou para mudar onde e como ele publica.
---

# Criar o segundo cérebro

O resultado é uma pasta em Markdown que o Claude lê antes de trabalhar e atualiza depois, mais um
`.segundo-cerebro.json` na raiz que liga os hooks do plugin: ao fim de cada resposta eles conferem
a memória, procuram segredos e publicam no git.

## 1. Entender o terreno (sem perguntar o que dá para ver)
- Rode `git status` e `git remote -v` na raiz do projeto. Anote se é repositório git e se tem remoto.
- Veja se já existe `.segundo-cerebro.json`. Se existir, este é um ajuste: leia a configuração e
  mude só o que o usuário pediu.
- Liste as pastas de primeiro nível (ex.: `app/`, `site/`, `clientes/`) para sugerir quais exigem ficha.

## 2. Perguntar só o essencial (uma rodada, de preferência com AskUserQuestion)
1. **Sobre quem é o cérebro:** nome da empresa, pessoa ou projeto.
2. **Nome da pasta:** `segundo-cerebro` (recomendado) ou outro, como `second-brain` ou `docs/cerebro`.
3. **Publicação ao fim de cada resposta:**
   - `push` (recomendado com remoto): commit e push. É o backup automático.
   - `commit`: só commit local.
   - `nao`: só confere a memória, sem tocar no git.
   Se não houver remoto, avise que `push` vira commit local até o usuário conectar um
   (`git remote add origin <url>`). Se não for repositório git, ofereça rodar `git init`.
   **Cuidado:** com `push` ou `commit`, o hook faz `git add -A` de tudo no projeto. Confira se o
   `.gitignore` cobre `node_modules/`, `.env`, saídas de build e arquivos grandes antes de ativar.
4. **Pastas que exigem ficha (opcional):** subpastas destas (ex.: `app,clientes`) precisam aparecer em
   alguma ficha de `projetos/`, senão o hook pede a ficha.

## 3. Criar
Rode o script do plugin, que nunca sobrescreve arquivo existente:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/criar.mjs" --dir "<raiz do projeto>" --nome "<nome>" --pasta <pasta> --publicar <push|commit|nao> --fichas "<a,b>"
```

Se `${CLAUDE_PLUGIN_ROOT}` não estiver definido no terminal, o script fica em `../../scripts/criar.mjs`
a partir da pasta desta skill (no plugin) ou em `~/.segundo-cerebro/scripts/criar.mjs` (instalação para
Cursor e Hermes).

O script cria a pasta do cérebro, o `.segundo-cerebro.json` e o mesmo bloco de instruções no `CLAUDE.md`
(Claude Code) e no `AGENTS.md` (Codex, Cursor, Hermes), entre `<!-- segundo-cerebro:inicio -->` e
`<!-- segundo-cerebro:fim -->`. Rodar de novo só atualiza esse bloco e a configuração.

## 4. Preencher o contexto (entrevista curta)
O cérebro só vale o que tem dentro. Faça no máximo cinco perguntas, em uma ou duas rodadas, para
preencher `contexto/quem-somos.md`, `contexto/publico.md` e `contexto/tom-de-voz.md`:
- O que você faz, em uma frase, e para quem?
- Qual problema resolve e como mede sucesso?
- Quem decide a compra e o que essa pessoa precisa ouvir?
- Três adjetivos do seu jeito de falar, e o que você nunca diria?
- Quais projetos estão ativos agora?

Regras: **não invente** nada sobre o usuário ou a empresa; campo sem resposta fica vazio. Se ele
tiver material pronto (site, apresentação, documento), leia e extraia daí, confirmando o que tirou.
Para cada projeto ativo, crie uma ficha em `projetos/` a partir de `_modelo.md`, com a pasta do código
quando houver (é o que a conferência de fichas procura).

## 5. Fechar
- Acrescente no `memoria/log.md` o que foi preenchido.
- Diga ao usuário, em poucas linhas: onde está o cérebro, o que acontece sozinho ao fim de cada
  resposta, e as três frases que ele vai usar: "registra isso", "revisa o segundo cérebro" e
  "o que já decidimos sobre X?".
- Os hooks valem a partir de agora: o `.segundo-cerebro.json` é o que os liga. Para desligar,
  basta apagar esse arquivo.
- Se o usuário também usa Cursor ou Hermes no mesmo projeto, lembre que eles precisam do instalador
  (`instalar.sh` ou `instalar.ps1`, no README do plugin) para ter os mesmos hooks e skills.
