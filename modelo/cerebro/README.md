# Segundo cérebro

Base de conhecimento em Markdown sobre {{NOME}}. O Claude lê antes de trabalhar e atualiza depois.
Cada pasta tem um papel e nenhuma se sobrepõe às outras.

| Pasta        | Papel                                                           |
|--------------|-----------------------------------------------------------------|
| `00-inbox/`  | Captura rápida: jogue aqui qualquer ideia, link ou anotação     |
| `contexto/`  | Quem você é: negócio, público, tom de voz                       |
| `projetos/`  | Uma ficha por projeto ativo (objetivo, status, próximos passos) |
| `memoria/`   | Log do que foi feito, decisões (com o porquê) e aprendizados    |
| `conteudo/`  | Ideias de conteúdo e o que já foi publicado                     |
| `recursos/`  | Material de referência (artigos, benchmarks, modelos)           |
| `arquivo/`   | Projetos e notas encerrados                                     |

## Rotina
- **Capturar:** jogue tudo em `00-inbox/` sem se preocupar com organização, ou peça ao Claude
  "registra isso" (skill `registrar`).
- **Organizar:** peça "revisa o segundo cérebro" (skill `revisar-cerebro`) para esvaziar o inbox
  e conferir as fichas.
- **Escrever à mão:** `contexto/` e as decisões importantes são suas. O Claude pode sugerir,
  mas a palavra final sobre quem você é deve ser sua.

## O que acontece sozinho
Ao fim de cada resposta do Claude, o plugin `segundo-cerebro` confere a memória (log em dia,
fichas para as pastas exigidas, nada de conflito pela metade), procura chaves de API e senhas,
e publica (commit e push, conforme `.segundo-cerebro.json` na raiz do projeto).
Se algo falhar, o aviso aparece no início da próxima sessão.
