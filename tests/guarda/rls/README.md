# Ensaio de RLS — a migration antes de encostar em produção

> Escrito em 24/08/2026, para a migration 052 (papéis por tenant).

## Por que existe

O Supabase é **único**: dev e prod são a mesma instância, então "testar a
migration" e "aplicar em produção" seriam o mesmo ato. Com clientes ativos no
banco isso é inaceitável — uma policy errada não dá erro, dá silêncio: o cliente
para de enxergar o próprio dado, ou pior, passa a enxergar o de outro.

A suíte de `npm run test` prova o que está ESCRITO na migration (as policies
certas, o backfill na ordem certa). Ela não prova o que o Postgres FAZ com
aquilo. Estes dois arquivos provam — num banco descartável, com RLS ligada e um
papel sem privilégio, que é a única forma de a resposta valer alguma coisa.

Foi assim que apareceu o caso do operador da plataforma: o trigger o autoriza,
mas a policy de `workspaces` o filtra antes, porque ele não é membro daquele
workspace. Nenhum teste estático encontraria isso.

## Como rodar

Precisa de um Postgres local (não do Supabase — é justamente o ponto).

```
npm run guarda:rls
```

O que ele faz:

1. `052-retrato.sql` — cria um banco novo com o mínimo do Supabase (schema
   `auth`, `auth.uid()` simulada por GUC, RLS ligada, papel `authenticated`) e
   um retrato do estado REAL de produção: workspace com admin+member, um
   workspace **sem dono nenhum**, e um `role` com valor inválido (`editor`) —
   porque a coluna nunca teve CHECK e o banco tem o que a vida colocou lá.
2. Aplica a migration de verdade, a partir de `supabase/migrations/`.
3. `052-assercoes.sql` — troca de usuário (`auth.uid()`) e afere o EFEITO:
   quem lê, quem escreve, quem é barrado.

Saída esperada: **15 PASSOU, nenhum FALHOU**. Qualquer FALHOU reprova o deploy.

## O que cada asserção protege

| Caso | Defeito que ele impede de voltar |
|---|---|
| CHECK recusa `admin` | a coluna aceitava qualquer string |
| membro comum LÊ o time | fechar demais também é defeito |
| membro não se promove / não rebaixa / não remove | a policy era `for all` |
| **bypass fechado** | `with check (user_id = auth.uid())` sem `workspace_id` |
| membro não se dá crédito | `creditos_saldo` era editável pelo cliente |
| dono promove / edita empresa | o dono precisa continuar trabalhando |
| último dono não cai | workspace ingovernável |
| operador ajusta plano | suporte precisa funcionar |
| servidor debita crédito | o cron não pode ser barrado pelo próprio trigger |

## Limite honesto

O retrato é uma reprodução, não uma cópia do banco real. Ele cobre as formas que
conhecemos (dono, membro, operador, órfão, valor inválido). Uma forma de dado
que ninguém imaginou passa por aqui sem ser vista — por isso o roteiro de deploy
manda conferir a contagem de papéis em produção logo depois de aplicar.
