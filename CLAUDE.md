# Regras deste repositório

Curto de propósito. O que está aqui é o que **quebra produção** quando ignorado.

## Branches — a `main` É o deploy

**Todo commit vai para a `dev`. A `main` só recebe merge quando o Danilo pedir,
com essas palavras.**

A `main` é o branch de produção no Netlify: **cada push nela dispara um deploy
automático**. Não é convenção de organização — é o portão de produção. Um commit
na `main` é um deploy, mesmo sem ninguém rodar nada.

- A autorização é por vez. Ter aprovado um merge antes não autoriza o próximo.
- Depois de um `checkout main` para mergear, **voltar para a `dev`** antes de
  commitar qualquer coisa nova.
- `git push origin main` é ato de deploy: confirmar antes.
- Force-push na `main` reescreve histórico publicado: só com ok explícito.

> Em 01/set/2026 quatro commits foram direto para a `main`. Três só não
> publicaram porque um guarda de build escrito horas antes os barrou; o quarto
> publicou e derrubou `app.br4ndcode.com` por seis minutos.

## Segredos — filtrar ANTES, não conferir depois

Comando que pode devolver credencial tem que ser mascarado **antes** de rodar.

- Do `.env`, imprimir só **nome e formato** (`publishable` / `secret` / `JWT
  legado`), nunca valor.
- Comparar chaves por **sufixo de 4 caracteres**, nunca por valor.
- ⚠️ `supabase branches get` devolve a `service_role` **em claro**.
- ⚠️ A API do Netlify devolve valores **mascarados** (`********************`).
  **Nunca ler-e-regravar uma variável de ambiente do Netlify**: você grava a
  máscara por cima do valor. Use `netlify env:set` com o valor da origem, e
  confira por **tamanho**, não por hash — hash de mascarado contra mascarado
  bate.

## Banco — dev e prod são a mesma instância

Nunca `supabase db push` direto. Use `./scripts/migrate.sh`, que faz dump
pré-migration no R2 e só então aplica.

Os ensaios, todos em Postgres descartável:

| comando | prova |
|---|---|
| `npm run guarda` | suíte + varredura de mutação (roda no hook do núcleo) |
| `npm run guarda:rls` | o que as policies FAZEM, e os backfills |
| `npm run guarda:replay` | as migrations aplicam do zero |
| `npm run guarda:ao-vivo` | alucinação do modelo — obrigatório se tocou o núcleo |

⚠️ Matar `npm run guarda` no meio deixa **lixo de mutação** na árvore: a
varredura altera arquivos no lugar. Conferir `git status` depois de interromper.

## Núcleo de IA

Os 11 arquivos de `npm run nucleo` têm hook de pre-commit e regras próprias em
`.spec/nucleo-ia.md`. Mudança neles **não pega carona** em commit de outra coisa.

## Onde ler

`.spec/README.md` → `.spec/backlog.md` (canônico) → `.spec/nucleo-ia.md` antes de
tocar em arquivo com LLM plugada.

⚠️ O backlog tem **duas sequências `E1…E7`**: uma do Programa Estúdio v2 e outra
da Evolução da Escuta. Conferir de qual se está falando.
