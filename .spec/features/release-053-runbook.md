# Runbook — release da sessão de suporte (migration 053)

> Escrito em 29–30/ago/2026. **Executar fora do horário comercial.**
> Regra da casa: objetivo declarado → testes → quality gate → security gate →
> aprovada. Todos cumpridos; falta a janela.

## O que sobe

| | |
|---|---|
| Migration | `053_sessao_de_suporte.sql` — S0 + S3 + S4 |
| Functions novas | `admin-support-session.js`, `admin-panorama.js` |
| Frontend | `sessaoSuporte.js`, o diálogo de motivo no `/admin`, a tarja com a validade, os dois painéis cross-tenant lendo pelo servidor |
| Infra | `public/_headers` (C3) |

**Efeito:** o operador deixa de ver conteúdo de cliente sem declarar tenant,
motivo e prazo. Cada entrada fica registrada em `platform_admin_sessions`.

**O que NÃO muda para o cliente:** nada. Nenhuma policy de membro foi afrouxada
ou restringida — só a cláusula do operador mudou.

## Portões (30/ago)

| Portão | Resultado |
|---|---|
| Testes | 535 passando, 3 skipped |
| `npm run guarda` | 89/89 mutações |
| `npm run guarda:rls` | 82/82 asserções |
| `npm run guarda:esquema` | ✓ limpo sobre o esquema real, sem sobra de bypass |
| Build | dist íntegro, 47 assets |
| Security gate | sem achados |

## A ordem, e por que ela é essa

### 1. Dump pré-migration

```
BACKUP_TAG=pre-migration ./scripts/backup-db.sh
```

Mesmo procedimento da 052 (26/ago). Confirmar o arquivo no R2 antes de seguir.

### 2. Código PRIMEIRO — merge `dev` → `main`

O código novo aguenta o banco velho: sem a 053, o `admin-panorama` funciona
igual (o servidor lê com service key de qualquer jeito) e a impersonação segue
pelo bypass permanente do 007. **O contrário não é verdade** — com a migration
aplicada e o código velho no ar, o `/admin` lê `brand_intelligence` do browser
e abre vazio.

É a lição da Zétona (25/ago): *escrita também atravessa a janela do deploy*.

Aguardar o deploy ficar `ready` e conferir o bundle em produção antes de seguir.

### 3. Migration depois

```
./scripts/migrate.sh   # ou aplicar 053 pelo caminho de sempre
```

### 4. Conferir ao vivo — nesta ordem

1. `/admin` abre. **Histórico de diagnósticos** lista os leads (~124).
2. **Custos** e **Cérebros** carregam (agora vêm do servidor).
3. "Entrar →" numa marca **pede motivo e validade**.
4. Dentro do cliente: **Tendências, Insights, Mercado, Clipping, Peças e
   Diagnósticos de concorrentes** trazem conteúdo — são as seis do S0.
5. **Biblioteca/Ativos** e o **Copiloto** respondem — são as seis achadas em
   29/ago (`brand_assets`, `brand_book_chunks`).
6. A tarja mostra **"sessão de suporte até HH:MM"**.
7. Sair da impersonação e confirmar que a sessão encerra.

Conferir no banco:

```sql
select admin_user_id, workspace_id, motivo, criada_em, expira_em, encerrada_em
  from platform_admin_sessions order by criada_em desc limit 5;
```

### 5. O S1 fica para OUTRO dia

Tirar o operador de `workspace_members` só depois de a 053 estar de pé e a
impersonação conferida ao vivo. **Na ordem inversa o operador perde acesso a
tudo** — inclusive ao caminho de consertar.

## Se der errado

A migration só troca policies e cria uma tabela; não altera dado de cliente.

**Reverter é recriar as policies antigas.** O caminho mais rápido e seguro é
restaurar o catálogo a partir do dump do passo 1 (`pg_restore` seletivo — ver
`.spec/backup.md`), não escrever SQL de rollback à mão às 22h.

Sintoma mais provável de problema: **tela de cliente vazia** na impersonação.
Significa sessão não aberta ou tabela sem a regra — não é perda de dado. O dado
está lá; o que falta é a permissão.

## Pendências que NÃO bloqueiam este deploy

- **A CSP está em `Report-Only`.** Rodar ~1 semana, ler os relatos, então trocar
  o nome do cabeçalho em `public/_headers`.
- **O S4 tem o dado e não tem tela** — a trilha existe no banco e ninguém a lê
  no `/admin`. É o que se mostra em due diligence; próximo tijolo.
- **`solicitacoes` tem `for select/update using (true)`** — qualquer usuário
  logado, de qualquer cliente, lê e edita a base inteira de leads.
  Pré-existente, mesma família do que a 049 fechou. Item próprio.
- **As policies de membro não têm cláusula `to`**, então valem para `anon`. Hoje
  inofensivo (tudo depende de `auth.uid()`), mas é a forma do defeito da 049.
  Varredura sobre as ~40 policies, item próprio.
