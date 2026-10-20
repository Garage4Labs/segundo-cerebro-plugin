## Segundo cérebro

Este projeto tem um segundo cérebro em `{{PASTA}}/` (plugin [segundo-cerebro](https://github.com/Garage4Labs/segundo-cerebro-plugin)).

### Antes de qualquer tarefa
1. Leia `{{PASTA}}/contexto/` para entender quem somos, o público e o tom de voz.
2. Leia a ficha do projeto em `{{PASTA}}/projetos/` correspondente à tarefa.
3. Consulte `{{PASTA}}/memoria/decisoes.md` para não contradizer decisões já tomadas.

### Depois de qualquer tarefa relevante
- Registre uma linha em `{{PASTA}}/memoria/log.md` (data, o que foi feito).
- Se houve decisão, registre em `{{PASTA}}/memoria/decisoes.md` com o porquê.
- Se aprendeu algo reutilizável, registre em `{{PASTA}}/memoria/aprendizados.md`.
- Projeto novo ganha ficha em `{{PASTA}}/projetos/` (copie `_modelo.md`).
- Não invente fatos sobre quem somos: na dúvida, pergunte e registre a resposta.
- Publicar é automático: ao fim de cada resposta, o hook do segundo cérebro (Claude Code, Codex,
  Cursor ou Hermes) confere a memória, faz commit e push, conforme `.segundo-cerebro.json`.
  Se ele pedir correção, corrija. Num agente sem o hook, faça commit e push ao terminar.
