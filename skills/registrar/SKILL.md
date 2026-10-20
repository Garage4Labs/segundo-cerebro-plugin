---
name: registrar
description: Guarda no segundo cérebro uma decisão, um aprendizado, uma ideia, uma tarefa de projeto ou uma informação sobre o negócio, no lugar e formato certos. Use quando o usuário disser "registra isso", "anota", "guarda essa decisão", "lembra que…", "decidimos que…", "aprendi que…", "ideia de conteúdo:", ou perguntar "o que já decidimos sobre X?".
---

# Registrar no segundo cérebro

A pasta do cérebro está em `.segundo-cerebro.json` (campo `pasta`, padrão `segundo-cerebro`).
Se o arquivo não existir, ofereça criar o cérebro com a skill `criar-cerebro`.

## Onde cada coisa vai
| O usuário disse | Destino | Formato |
|---|---|---|
| Uma escolha feita ("vamos usar X", "decidimos…") | `memoria/decisoes.md`, na seção do assunto | `AAAA-MM-DD — decisão. **Por quê:** motivo.` |
| Uma lição que serve de novo | `memoria/aprendizados.md` | `AAAA-MM-DD — lição.` |
| Algo que foi feito | `memoria/log.md`, no fim | `AAAA-MM-DD — o que foi feito.` |
| Tarefa, prazo ou status de um projeto | a ficha em `projetos/` | item em "Próximos passos" ou campo da ficha |
| Fato sobre a empresa, o público ou a voz | o arquivo certo em `contexto/` | no campo correspondente |
| Ideia de conteúdo | `conteudo/ideias.md` | `- AAAA-MM-DD — ideia (canal, público).` |
| Link, artigo, referência | `recursos/` | um arquivo por assunto |
| Não sabe onde encaixar | `00-inbox/` | arquivo curto; a revisão organiza depois |

## Regras
- Decisão sem porquê não serve: se o usuário não disse o motivo, pergunte em uma linha.
- Antes de registrar uma decisão, procure em `decisoes.md` se ela contradiz outra. Se contradiz,
  mostre a antiga e pergunte se a nova a substitui; se sim, risque a antiga (`~~assim~~`) e registre a nova.
- Use a data de hoje no formato `AAAA-MM-DD`. Escreva curto, na voz de `contexto/tom-de-voz.md`.
- Confirme em uma linha o que foi gravado e onde.

## Consultar ("o que já decidimos sobre X?")
Procure o termo em `memoria/decisoes.md`, `memoria/aprendizados.md`, nas fichas de `projetos/` e no
`log.md`. Responda com as linhas encontradas (com data) e diga se alguma foi substituída depois.
Se não houver nada, diga isso e não suponha.
