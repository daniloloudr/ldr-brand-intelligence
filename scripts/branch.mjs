// ════════════════════════════════════════════════════════════════════
// branch.mjs — a esteira do banco de dev: subir · testar · MATAR.
//
// POR QUE ESTE ARQUIVO EXISTE
// O Supabase deste projeto é único: dev e prod são a mesma instância, e é por
// isso que os ensaios (`guarda:rls`, `guarda:esquema`, `guarda:replay`) rodam em
// Postgres descartável. Eles provam SQL; não deixam ninguém clicar na app.
//
// Preview branch resolve isso — e cobra por hora. Por isso o verbo que mais
// importa aqui é `matar`, e por isso `status` mostra HÁ QUANTO TEMPO o branch
// está de pé: branch esquecido é fatura silenciosa.
//
//   npm run branch:subir    cria (ou reusa) o branch e escreve .env.branch
//   npm run branch:status   o que está de pé, e desde quando
//   npm run branch:matar    apaga o branch
//   npm run dev:branch      sobe a app apontada para o branch
//
// SEGREDO NUNCA VAI PARA A TELA. O `supabase branches get` devolve a
// service_role em claro; este script escreve em arquivo e imprime mascarado.
// (Descoberto do jeito ruim: rodando o comando cru e vendo a chave de PRODUÇÃO
// aparecer no terminal.)
// ════════════════════════════════════════════════════════════════════
import { execFileSync } from 'node:child_process'
import { writeFileSync, existsSync, unlinkSync } from 'node:fs'

const BRANCH = process.env.BRANCH_NOME || 'dev'
const ENVFILE = '.env.branch'
const verbo = process.argv[2]

const sb = (args, silencioso = false) => {
  try {
    return execFileSync('npx', ['supabase', ...args], { encoding: 'utf8', stdio: ['pipe', 'pipe', silencioso ? 'pipe' : 'inherit'] })
  } catch (e) { return String(e.stdout || '') }
}
// O CLI tem DUAS saídas JSON e elas não têm a mesma forma: `-o json` devolve um
// array cru, `--output-format json` devolve {branches:[…]}. Aceitar as duas
// evita que uma atualização do CLI transforme "nenhum branch" em resposta
// silenciosa — que foi como este parser errou na primeira versão.
const listar = () => {
  try {
    const bruto = JSON.parse(sb(['branches', 'list', '-o', 'json'], true))
    return Array.isArray(bruto) ? bruto : (bruto.branches || [])
  } catch { return [] }
}
const mascara = (v) => (!v ? '' : v.length <= 12 ? '***' : `${v.slice(0, 6)}…${v.slice(-4)}`)
const acha = (nome) => listar().find(b => b.name === nome)

// ── A guarda que impede o acidente caro ─────────────────────────────
// `branches delete` aceita o nome que vier. O branch DEFAULT é a produção — e
// um `matar main` distraído seria irreversível. Três checagens, e nenhuma delas
// confia no nome sozinho.
function recusaSeForProducao(b) {
  if (!b) return
  const motivos = []
  if (b.is_default) motivos.push('é o branch DEFAULT')
  if (b.project_ref === b.parent_project_ref) motivos.push('aponta para o projeto-pai (é a própria produção)')
  if (b.name === 'main') motivos.push('chama-se "main"')
  if (motivos.length) {
    console.error(`\n✖ RECUSADO: "${b.name}" ${motivos.join(', ')}.`)
    console.error('  Este script não apaga produção. Se era mesmo isso, faça no painel.\n')
    process.exit(1)
  }
}

if (verbo === 'status') {
  const bs = listar()
  if (!bs.length) console.log('nenhum branch.')
  else console.log('')
  for (const b of bs) {
    const horas = ((Date.now() - new Date(b.created_at)) / 36e5)
    const etiqueta = b.is_default ? ' (PRODUÇÃO — não mexer)' : ''
    console.log(`  ${b.name}${etiqueta}`)
    console.log(`    ${b.preview_project_status || b.status} · de pé há ${horas.toFixed(1)}h · dado clonado: ${b.with_data ? 'sim' : 'não'}`)
  }
  if (bs.some(b => !b.is_default)) console.log('\n  ⚠ branch de preview cobra por hora. `npm run branch:matar` quando terminar.\n')

} else if (verbo === 'subir') {
  let b = acha(BRANCH)
  if (b) {
    console.log(`branch "${BRANCH}" já existe (${b.preview_project_status || b.status}) — reusando.`)
  } else {
    const comDado = process.argv.includes('--com-dado')
    console.log(`criando branch "${BRANCH}"${comDado ? ' COM cópia do dado de produção' : ' vazio (só o esquema)'}…`)
    sb(['branches', 'create', BRANCH, '--git-branch', BRANCH, ...(comDado ? ['--with-data'] : []), '--yes'])
    b = acha(BRANCH)
    if (!b) { console.error('✖ o branch não apareceu na listagem depois do create.'); process.exit(1) }
  }

  if ((b.preview_project_status || '') !== 'ACTIVE_HEALTHY') {
    console.log(`  estado: ${b.preview_project_status || b.status} — o Supabase ainda está aplicando as migrations.`)
    console.log('  rode `npm run branch:status` até ficar ACTIVE_HEALTHY, depois `npm run branch:subir` de novo.')
    process.exit(0)
  }

  const d = JSON.parse(sb(['branches', 'get', BRANCH, '-o', 'json'], true))

  // As chaves LEGADAS (eyJ…) que o `branches get` devolve podem estar
  // desabilitadas no projeto-pai — foi o que aconteceu em 01/set, e o branch
  // nasceu respondendo 401 em tudo. `SUPABASE_DEFAULT_KEY` é a secret no
  // formato novo (sb_secret_), que sobrevive a isso. Preferir a nova e cair na
  // legada só se ela não vier.
  const secret = /^sb_secret_/.test(String(d.SUPABASE_DEFAULT_KEY || ''))
    ? d.SUPABASE_DEFAULT_KEY : d.SUPABASE_SERVICE_ROLE_KEY
  const anon = d.SUPABASE_ANON_KEY
  if (secret !== d.SUPABASE_DEFAULT_KEY) console.log('  ⚠ usando a service_role LEGADA — se o projeto desabilitou as legadas, isto vai dar 401')

  writeFileSync(ENVFILE, [
    `# Gerado por scripts/branch.mjs — branch "${BRANCH}". NÃO COMITAR.`,
    `# Apague junto com o branch: npm run branch:matar`,
    `VITE_SUPABASE_URL=${d.SUPABASE_URL}`,
    `VITE_SUPABASE_KEY=${anon}`,
    `SUPABASE_URL=${d.SUPABASE_URL}`,
    `SUPABASE_KEY=${anon}`,
    `SUPABASE_SERVICE_KEY=${secret}`,
    `SUPABASE_DB_URL=${d.POSTGRES_URL_NON_POOLING}`,
    '',
  ].join('\n'))
  console.log(`\n✓ ${ENVFILE} escrito`)
  console.log(`    URL:  ${d.SUPABASE_URL}`)
  console.log(`    anon: ${mascara(anon)}   service: ${mascara(secret)}`)
  console.log('\n  npm run dev:branch     sobe a app contra o branch')
  console.log('  npm run branch:matar   quando terminar (cobra por hora)\n')

} else if (verbo === 'matar') {
  const b = acha(BRANCH)
  if (!b) { console.log(`branch "${BRANCH}" não existe — nada a fazer.`); process.exit(0) }
  recusaSeForProducao(b)
  console.log(`apagando o branch "${BRANCH}"…`)
  sb(['branches', 'delete', BRANCH, '--yes'])
  if (existsSync(ENVFILE)) { unlinkSync(ENVFILE); console.log(`  ${ENVFILE} removido — a app volta a apontar para o .env`) }
  console.log('✓ pronto. O relógio parou.\n')

} else {
  console.log(`
esteira do banco de dev

  npm run branch:subir              cria/reusa o branch "${BRANCH}" (só esquema)
  npm run branch:subir -- --com-dado  ...clonando o dado de PRODUÇÃO
  npm run branch:status             o que está de pé, e desde quando
  npm run dev:branch                sobe a app contra o branch
  npm run branch:matar              apaga o branch e o ${ENVFILE}

outro nome:  BRANCH_NOME=experimento npm run branch:subir
`)
}
