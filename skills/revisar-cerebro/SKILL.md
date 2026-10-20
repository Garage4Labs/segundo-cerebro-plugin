---
name: revisar-cerebro
description: Organiza e audita o segundo cérebro do projeto. Use quando o usuário pedir para revisar, organizar, limpar ou atualizar o segundo cérebro, esvaziar o inbox, ou conferir se fichas de projeto e memória estão em dia.
---

# Revisar o segundo cérebro

A pasta do cérebro está em `.segundo-cerebro.json` (campo `pasta`, padrão `segundo-cerebro`).
Abaixo, `<cerebro>` é essa pasta.

1. **Inbox:** para cada arquivo em `<cerebro>/00-inbox/`, decida o destino (`contexto/`, `projetos/`,
   `memoria/`, `conteudo/` ou `recursos/`), incorpore o conteúdo e apague o original. Decisão vai para
   `memoria/decisoes.md` com o porquê; lição reutilizável, para `memoria/aprendizados.md`. Na dúvida,
   pergunte ao usuário.
2. **Projetos:** confira se status e próximos passos de cada ficha em `<cerebro>/projetos/` batem com o
   que existe nas pastas do projeto e com o `memoria/log.md` recente. Marque o que já foi feito.
   Projetos concluídos vão para `<cerebro>/arquivo/`. Pasta de trabalho sem ficha ganha uma a partir
   de `_modelo.md`.
3. **Decisões:** procure decisões que se contradizem ou que o log mostra que mudaram. Não apague:
   pergunte ao usuário qual vale, registre a nova com o porquê e risque a antiga (`~~assim~~`).
4. **Lacunas:** liste campos vazios em `<cerebro>/contexto/` e pergunte ao usuário como preenchê-los.
   Não invente informações sobre quem ele é.
5. **Log:** registre a revisão em `<cerebro>/memoria/log.md`.
6. Termine com um resumo curto: o que mudou, o que ficou pendente e as perguntas em aberto.
