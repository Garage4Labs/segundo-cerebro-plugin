# Segundo cérebro para agentes de IA

Um plugin que dá memória de longo prazo ao Claude Code, Codex, Cursor e Hermes. Ele cria uma pasta em
Markdown com quem você é, seus projetos e suas decisões. O agente lê essa pasta antes de trabalhar, atualiza depois e
publica sozinho no git. Você para de repetir contexto em toda conversa e para de perder decisões no histórico do chat.

> **Conceito e autoria:** Uderson Fermino · **Implementação:** [Garage4Lab](https://github.com/Garage4Labs) · em português

## O conceito

> *"Estamos construindo agentes de IA cada vez mais inteligentes, mas nossas organizações continuam
> esquecendo aquilo que aprenderam."*
> — Uderson Fermino

Este plugin é a implementação prática do **Second Brain para IA**, conceito criado por **Uderson Fermino**,
fundador da Garage4Lab. A pergunta que o originou: a nossa capacidade de preservar conhecimento está
evoluindo na mesma velocidade que a nossa capacidade de automatizar decisões?

O conceito se apoia em duas ideias, propostas pelo autor.

### Dívida de Contexto (Context Debt)

Assim como acumulamos dívida técnica, acumulamos uma dívida invisível quando deixamos de documentar
decisões, preservar aprendizados e registrar o raciocínio que sustenta arquiteturas e processos.
Ela aparece quando é preciso reconstruir a história de um projeto, repetir um diagnóstico ou explicar
de novo o que a organização já deveria saber. Agentes de IA ampliam esse problema: cada conversa
começa do zero.

### Conhecimento como código (Knowledge as Code)

A proposta é aplicar ao conhecimento os princípios que a engenharia de software já domina:
**versionamento, rastreabilidade, revisão, automação e governança**. Na prática, um Second Brain com o
GitHub como base de uma memória persistente, estruturada e compartilhável entre agentes diferentes.
Assim o conhecimento sobrevive às conversas, aos modelos e até às mudanças de tecnologia.

> *"Talvez estejamos investindo milhões na inteligência dos agentes enquanto continuamos acumulando uma
> dívida sobre aquilo que nossas organizações já aprenderam. De que adianta termos agentes capazes de
> pensar e executar se eles não conseguem compreender por que fizemos o que fizemos?"*
> — Uderson Fermino

### Como o plugin traduz o conceito

| Princípio | No plugin |
|---|---|
| Versionamento | todo o cérebro é Markdown num repositório git |
| Rastreabilidade | `decisoes.md` guarda cada decisão com data e **porquê**; `log.md`, cada tarefa |
| Revisão | a skill `revisar-cerebro` organiza o inbox, atualiza fichas e expõe contradições |
| Automação | os hooks conferem a memória e publicam ao fim de cada resposta do agente |
| Governança | o agente não encerra com trabalho sem registro e não publica segredos |
| Compartilhável entre agentes | o mesmo cérebro, as mesmas skills e os mesmos hooks no Claude Code, Codex, Cursor e Hermes |

## O que muda na prática

| Sem segundo cérebro | Com segundo cérebro |
|---|---|
| Toda conversa começa do zero: "somos uma empresa de…" | O agente já sabe quem você é, para quem fala e como fala |
| A decisão de três semanas atrás se perde no histórico | `decisoes.md` guarda a decisão com o porquê, e o agente confere antes de propor algo |
| Você precisa lembrar de salvar, commitar e fazer backup | Ao fim de cada resposta, o hook confere e publica sozinho |
| Ninguém sabe o que foi feito ontem | `log.md` tem uma linha por tarefa, com data |

## Funciona em

O cérebro é Markdown num repositório git, então não pertence a nenhuma ferramenta: o mesmo projeto pode
ser usado no Claude Code de manhã e no Cursor à tarde, e a memória é uma só.

| Ferramenta | Como instala | Skills | Hooks (conferir e publicar) | Instruções lidas |
|---|---|---|---|---|
| **Claude Code** | plugin | ✅ | ✅ início de sessão e fim de resposta | `CLAUDE.md` |
| **Codex** | o mesmo plugin | ✅ | ✅ início de sessão e fim de resposta | `AGENTS.md` |
| **Cursor** | instalador | ✅ | ✅ início de sessão e fim de resposta | `AGENTS.md` |
| **Hermes** | instalador | ✅ | ✅ fim de resposta (o pedido de correção vale quando a resposta editou arquivos) | `AGENTS.md` |
| Outros (Gemini CLI, Copilot…) | nenhum | — | — (rode a conferência à mão) | `AGENTS.md` |

Requisitos para todos: Node.js 18+ e git.

## Instalar

### Claude Code

```
/plugin marketplace add Garage4Labs/segundo-cerebro-plugin
/plugin install segundo-cerebro@segundo-cerebro
```

Ou no terminal: `claude plugin marketplace add Garage4Labs/segundo-cerebro-plugin` e
`claude plugin install segundo-cerebro@segundo-cerebro`.

### Codex

O Codex lê o mesmo plugin:

```bash
codex plugin marketplace add Garage4Labs/segundo-cerebro-plugin
codex plugin add segundo-cerebro@segundo-cerebro
```

Na primeira sessão, aprove os hooks do plugin em `/hooks` (o Codex não roda hook sem revisão).

### Cursor e Hermes

Um instalador clona o repositório em `~/.segundo-cerebro`, copia as skills e registra os hooks no
formato de cada ferramenta. Ele detecta sozinho quais delas estão instaladas e preserva os hooks que já existiam.

```bash
# macOS ou Linux
curl -fsSL https://raw.githubusercontent.com/Garage4Labs/segundo-cerebro-plugin/main/instalar.sh | bash
```

```powershell
# Windows (PowerShell)
irm https://raw.githubusercontent.com/Garage4Labs/segundo-cerebro-plugin/main/instalar.ps1 | iex
```

| | Skills | Hooks |
|---|---|---|
| Cursor | `~/.cursor/skills/segundo-cerebro-*` | `~/.cursor/hooks.json` (`sessionStart` e `stop`) |
| Hermes | `<HERMES_HOME>/skills/segundo-cerebro/` | `config.yaml` (`pre_llm_call`, `pre_verify`, `post_llm_call`) |

No Hermes, aprove os hooks na primeira sessão (ou rode `hermes --accept-hooks`); `hermes hooks list` mostra o estado.
Para atualizar, rode o instalador de novo. Para desfazer, use `bash -s -- --remover` no macOS ou Linux, ou
`$env:SEGUNDO_CEREBRO_ARGS='--remover'` antes do comando no Windows.

## Usar

Abra o agente na pasta do seu projeto (ou numa pasta vazia, só para o cérebro) e peça:

> cria um segundo cérebro aqui

O agente faz três ou quatro perguntas (nome, onde publicar), monta a pasta e entrevista você
rapidamente para preencher o contexto. Daí em diante, três frases resolvem o dia a dia:

| Você diz | O que acontece | Skill |
|---|---|---|
| "registra isso: decidimos usar X porque Y" | grava no lugar certo, com data e porquê | `registrar` |
| "o que já decidimos sobre preço?" | procura nas decisões, fichas e log e responde com as datas | `registrar` |
| "revisa o segundo cérebro" | esvazia o inbox, atualiza fichas e lista lacunas | `revisar-cerebro` |

No Claude Code e no Codex, as skills também ficam disponíveis como comando: `/segundo-cerebro:criar-cerebro`,
`/segundo-cerebro:registrar` e `/segundo-cerebro:revisar-cerebro`. No Cursor e no Hermes, elas se chamam
`segundo-cerebro-criar-cerebro`, `segundo-cerebro-registrar` e `segundo-cerebro-revisar-cerebro`.

## A estrutura

```
segundo-cerebro/
├── 00-inbox/     captura rápida, sem organizar
├── contexto/     quem-somos.md, publico.md, tom-de-voz.md (escritos por você)
├── projetos/     uma ficha por projeto ativo (_modelo.md é o molde)
├── memoria/      log.md, decisoes.md, aprendizados.md
├── conteudo/     ideias.md, publicados.md
├── recursos/     material de referência
└── arquivo/      o que foi encerrado
```

Além da pasta, o plugin escreve o mesmo bloco de instruções no `CLAUDE.md` (Claude Code) e no `AGENTS.md`
(Codex, Cursor, Hermes e outros), entre marcadores e sem mexer no resto dos arquivos, e cria
`.segundo-cerebro.json` na raiz do projeto.

## O que acontece sozinho

Os hooks **só agem em projetos que têm `.segundo-cerebro.json`**; nos outros, não fazem nada. É um script só
(`scripts/sincronizar.mjs`), que reconhece qual ferramenta o chamou e responde no formato dela.

**No início de cada sessão:** lembra o agente da rotina (ler o contexto, a ficha e as decisões antes;
registrar depois) e avisa se a última sincronização falhou.

**Ao fim de cada resposta do agente:**
1. **Confere a memória.** Se houve trabalho fora do cérebro sem linha nova no `log.md`, se uma pasta
   exigida está sem ficha ou se sobrou marcador de conflito, o hook devolve a tarefa ao agente, que
   corrige antes de encerrar. Ele só bloqueia uma vez por resposta, então nunca entra em loop.
2. **Procura segredos.** Se achar algo com cara de chave de API, token ou chave privada no que vai ser
   publicado, não publica nada e avisa.
3. **Publica.** Faz commit de tudo, traz o que outras máquinas publicaram (`rebase`, nunca força) e faz push.

Se algo falhar por rede ou permissão, o aviso aparece no início da próxima sessão e o agente resolve primeiro.

## Configuração

`.segundo-cerebro.json`, na raiz do projeto:

```json
{
  "pasta": "segundo-cerebro",
  "publicar": "push",
  "pastasComFicha": ["app", "clientes"],
  "ignorar": ["dist/"]
}
```

| Campo | O que faz |
|---|---|
| `pasta` | onde fica o cérebro (pode ser `docs/cerebro`, `second-brain`…) |
| `publicar` | `push` (commit e push, o padrão), `commit` (só local) ou `nao` (só confere) |
| `pastasComFicha` | cada subpasta destas precisa ser citada (ex.: `app/loja`) em alguma ficha de `projetos/` |
| `ignorar` | caminhos que não contam como trabalho para a regra do log |

Para desligar num projeto, apague `.segundo-cerebro.json`. Para desligar em tudo, `/plugin` → desativar.

**Atenção:** com `push` ou `commit`, o hook faz `git add -A`. Mantenha um `.gitignore` decente
(`.env`, `node_modules/`, builds, arquivos grandes) antes de ativar.

Para ter backup, conecte um repositório privado: `git remote add origin <url>`. Sem remoto, tudo fica no
commit local.

## Agentes sem hooks

Qualquer agente que leia `AGENTS.md` segue a rotina. Para conferir e publicar sem hook, rode no projeto:

```bash
node ~/.segundo-cerebro/scripts/sincronizar.mjs --manual
```

## Desenvolvimento

```bash
npm test                          # 14 testes: Claude/Codex, Cursor, Hermes e o instalador
claude plugin validate .          # valida o marketplace e o plugin
claude --plugin-dir .             # testa o plugin local sem instalar
```

## Autoria e licença

O conceito de **Second Brain para IA**, com **Dívida de Contexto** e **Knowledge as Code**, é de
**Uderson Fermino**. Ao usar, adaptar ou citar este trabalho, credite o autor do conceito.

Código sob licença MIT, © 2026 Garage4Lab. Veja [LICENSE](LICENSE).
