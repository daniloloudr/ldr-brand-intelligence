# Backup & Restore do Banco
### Estratégia (decisão Danilo 2026-07-15) · Supabase único = dev+prod

> **Regra de ouro:** ninguém roda `supabase db push` direto. Migrations vão pelo
> `scripts/migrate.sh`, que faz backup ANTES. Claude não escreve em produção sem
> aprovação (memória `feedback-nunca-escrever-producao-sem-aprovacao`).

## Camadas ativas

| Camada | Frequência | Onde | Retenção |
|---|---|---|---|
| **Dump diário** | 06:00 UTC (GitHub Actions) | R2 `db/db_*_daily.dump` | via lifecycle do bucket (ver abaixo) |
| **Dump pré-migration** | a cada migration | R2 `db/db_*_pre-migration.dump` | idem |
| **PITR** | — | — | ⏸️ ativar no plano Pro quando escalar |

Formato: `pg_dump -Fc` (custom, comprimido, restauração seletiva).

## Setup (uma vez — Danilo faz)

### 1. Bucket de backups no R2
Cloudflare → R2 → criar bucket `dumps1ngulr` (nome atual; era à escolha).
Opcional mas recomendado: **regra de lifecycle** expirando objetos do prefixo `db/`
após 30 dias (Settings do bucket → Object lifecycle rules) — poda os antigos sozinho.

### 2. Connection string do banco
Supabase → projeto `ldr-brand-intelligence` → Settings → Database →
**Connection string → Session pooler** (porta 5432, com a senha). É essa que o
`pg_dump` usa. Guarde — é o secret `SUPABASE_DB_URL`.
> ⚠️ **Use a Session pooler, NÃO a conexão direta** (`db.<ref>.supabase.co`): o host
> direto só tem IPv6 e os runners do GitHub Actions não têm IPv6 → `Network is unreachable`.
> Host confirmado deste projeto (us-west-2): `aws-1-us-west-2.pooler.supabase.com`,
> user `postgres.<ref>`.

### 3. Secrets do GitHub (para o dump diário)
Repo → Settings → Secrets and variables → Actions → New repository secret:
- `SUPABASE_DB_URL` — a string do passo 2
- `R2_ACCOUNT_ID` · `R2_ACCESS_KEY_ID` · `R2_SECRET_ACCESS_KEY` — copie do Netlify (env do site)
- `R2_BACKUP_BUCKET` — nome do bucket do passo 1

Testar: aba **Actions → Backup diário do banco → Run workflow** (botão manual).
Se aparecer o `.dump` no R2, está funcionando.

### 4. Ambiente local (para o migrate.sh / dumps manuais)
- Instalar pg_dump 17: `brew install postgresql@17` (macOS)
- No `.env` local, adicionar: `SUPABASE_DB_URL`, `R2_ACCOUNT_ID`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BACKUP_BUCKET`
- Instalar aws-cli: `brew install awscli`

## Fluxo de migration (daqui pra frente)
1. Claude escreve o `.sql` em `supabase/migrations/` e mostra
2. Você roda `./scripts/migrate.sh` → ele faz o dump pré-migration no R2 e pede
   confirmação antes do `db push`
3. Se algo der errado, o dump de segundos antes está no R2

## Como RESTAURAR (religar o banco)
Baixe o `.dump` do R2 e restaure na connection string:

```bash
# baixar o backup escolhido
aws s3 cp "s3://dumps1ngulr/db/db_AAAAMMDD_HHMMSS_daily.dump" ./restore.dump \
  --endpoint-url "https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com"

# restaurar (--clean --if-exists derruba e recria os objetos antes)
pg_restore --clean --if-exists --no-owner --no-privileges \
  -d "$SUPABASE_DB_URL" ./restore.dump
```

Restauração seletiva (só uma tabela): `pg_restore -t nome_tabela …`.
Ver conteúdo de um dump sem restaurar: `pg_restore -l restore.dump`.

> **Cuidado:** restaurar SOBRESCREVE o banco atual. Em incidente real, primeiro
> tire um dump do estado corrompido (forense) e só então restaure o bom.
