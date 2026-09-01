import {} from "./constants";
import { PALETTE } from '../lib/theme'

// ─── Identidade do produto ───────────────────────────────────────────
// Fonte única do nome visível. A assinatura por extenso é BR4NDCODE
// (brand.md §01) — o "4" faz parte da marca, não só do domínio.
export const PRODUCT_NAME = 'BR4NDCODE';

// ─── Multitenant por subdomínio (nomedamarca.br4ndcode.com) ──────────
// Decisão 2026-07-20: o subdomínio é camada de RESOLUÇÃO + branding; o RLS por
// workspace_id segue sendo o perímetro real de segurança. Sistema = app./www./apex.
// Local (sem subdomínio): usar ?tenant=slug para simular.
// Env-driven para permitir preview/staging em outro apex sem tocar no código.
export const ROOT_DOMAIN = import.meta.env?.VITE_ROOT_DOMAIN || 'br4ndcode.com';
export const RESERVED_SUBDOMAINS = ['app', 'www', 'admin', 'api', 'static', 'assets'];

// slug do tenant atual, ou null quando é domínio de sistema (app/www/apex/localhost/preview)
export function getTenantSlug() {
  const q = new URLSearchParams(window.location.search).get('tenant');
  if (q) return q.trim().toLowerCase() || null;           // override local/dev
  const host = window.location.hostname;
  const suffix = '.' + ROOT_DOMAIN;
  if (!host.endsWith(suffix)) return null;                // localhost, previews, apex
  const sub = host.slice(0, -suffix.length);
  if (!sub || sub.includes('.')) return null;             // apex ou multi-nível
  if (RESERVED_SUBDOMAINS.includes(sub)) return null;     // subdomínio de sistema
  return sub.toLowerCase();
}

// Estamos rodando na máquina de quem desenvolve?
//
// É o HOST que responde, não o modo de build. `import.meta.env.DEV` depende de
// como o bundle foi gerado — um build de desenvolvimento servido em produção
// mentiria, e mentiria justamente numa decisão de acesso. O hostname não mente.
//
// Usado pelo atalho de `?tenant=` do operador (ver WorkspaceContext): repare
// que `getTenantSlug` acima aceita `?tenant=` em QUALQUER host, inclusive
// produção — o que é inofensivo enquanto o acesso exigir participação, e
// deixaria de ser no instante em que alguém abrisse exceção sem esta trava.
export const ehAmbienteLocal = () =>
  ['localhost', '127.0.0.1', '[::1]', '::1'].includes(window.location.hostname);

// URL de acesso do cliente (subdomínio da marca em produção)
export const tenantUrl = (slug) => `https://${slug}.${ROOT_DOMAIN}`;

// slugify — mesma lógica da migration 044 (minúsculas, sem acento, hífens)
export function slugify(nome) {
  return (nome || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

// ─── Navegação (History API — URLs limpas, sem #) ────────────────────
// Router manual (sem React Router). navigate() aceita "/app/x" E o legado
// "#/app/x" (tira o #), então call-sites que passam o hash antigo seguem
// funcionando. Preserva ?tenant= (simulação de subdomínio em dev).
export function navigate(to, { replace = false } = {}) {
  let path = String(to ?? '/');
  if (path.startsWith('#')) path = path.slice(1);       // legado #/x → /x
  if (!path.startsWith('/')) path = '/' + path;
  if (!path.includes('?')) {
    const t = new URLSearchParams(window.location.search).get('tenant');
    if (t) path += `?tenant=${encodeURIComponent(t)}`;
  }
  const cur = window.location.pathname + window.location.search;
  if (path !== cur) window.history[replace ? 'replaceState' : 'pushState']({}, '', path);
  // ASSÍNCRONO (igual ao hashchange antigo): os redirects de guarda do App.jsx
  // chamam navigate() DURANTE o render; disparar síncrono faria setState no meio
  // do render e quebrava o React (tela branca). O tick seguinte re-renderiza.
  setTimeout(() => window.dispatchEvent(new Event('popstate')), 0);
}

// caminho atual da rota (sem query) — substitui as leituras de location.hash
export const currentPath = () => window.location.pathname || '/';

// `caminho` opcional: sem ele resolve a rota ATUAL (o uso de sempre); com ele
// resolve um caminho qualquer, sem tocar em window. É o que permite descobrir
// para onde um link aponta antes de clicar — usado para rotular links que o
// Copiloto devolve (ver rotuloDoLink em copiloto.js).
export function getRoute(caminho) {
  const bruto = caminho != null ? String(caminho).replace(/^#/, '') : (window.location.pathname || '/');
  const p = bruto.split('?')[0].replace(/\/+$/, '') || '/';
  if (p === '/')                     return 'login';
  if (p === '/metodologia')          return 'metodologia';
  if (p.startsWith('/relatorio/'))   return 'relatorio-publico';
  if (p === '/login')                return 'login';
  if (p === '/app')                  return 'app-home';
  if (p === '/app/posicionamento')   return 'posicionamento';
  // legacy redirects mantidos temporariamente
  if (p === '/app/diagnostico')      return 'posicionamento';
  if (p === '/app/evolucao')         return 'posicionamento';
  if (p === '/app/concorrentes')     return 'posicionamento';
  if (p === '/app/listening')        return 'listening';
  if (p === '/app/content-hub')      return 'content-hub';
  if (p === '/app/market-intel')     return 'market-intel';
  if (p === '/app/insights')         return 'insights';
  if (p === '/app/competitors')      return 'competitors';
  if (p === '/app/trends')           return 'trends';
  if (p === '/app/reports')          return 'reports';
  if (p === '/app/workspace')        return 'workspace';
  if (p === '/app/conta')            return 'conta';
  if (p === '/app/time')             return 'time';
  if (p === '/app/plano')            return 'plano';
  if (p === '/app/alertas')          return 'alertas';
  // 'ia-loudr' foi o nome interno até o relançamento como BR4NDCODE; a rota antiga
  // segue resolvendo para não quebrar deep-link de e-mail/feed já disparado.
  if (p === '/app/inteligencia')     return 'inteligencia';
  if (p === '/app/ia-loudr')         return 'inteligencia';
  if (p === '/app/brands')                                        return 'brands-list';
  if (p === '/app/brands/new')                                    return 'brands-new';
  if (p.match(/^\/app\/brands\/[^/]+\/assistant/))               return 'brands-assistant';
  if (p.match(/^\/app\/brands\/[^/]+\/campaigns\/new/))          return 'brands-campaign-new';
  if (p.match(/^\/app\/brands\/[^/]+\/campaigns\/[^/]+/))        return 'brands-campaign-detail';
  if (p.match(/^\/app\/brands\/[^/]+\/campaigns/))               return 'brands-campaigns';
  if (p.match(/^\/app\/brands\/[^/]+\/studio\/campanhas/))       return 'brands-studio-campaigns';
  if (p.match(/^\/app\/brands\/[^/]+\/studio\/workflow/))        return 'brands-studio-workflow';
  if (p.match(/^\/app\/brands\/[^/]+\/studio\/video/))           return 'brands-studio-video';
  if (p.match(/^\/app\/brands\/[^/]+\/studio\/writing/))         return 'brands-studio-writing';
  if (p.match(/^\/app\/brands\/[^/]+\/studio\/biblioteca/))      return 'brands-studio-biblioteca';
  if (p.match(/^\/app\/brands\/[^/]+\/studio\/assets/))          return 'brands-studio-assets';
  if (p.match(/^\/app\/brands\/[^/]+\/studio\/approvals/))       return 'brands-studio-approvals';
  if (p.match(/^\/app\/brands\/[^/]+\/studio/))                  return 'brands-studio';
  if (p.startsWith('/app/brands/'))                               return 'brands-detail';
  if (p === '/admin')                return 'admin';
  if (p === '/admin/historico')      return 'admin-historico';
  return 'public';
}

export function getBrandId() {
  const m = (window.location.pathname || '').match(/^\/app\/brands\/([^/]+)/)
  return m ? m[1] : null
}

export function getCampaignId() {
  const m = (window.location.pathname || '').match(/^\/app\/brands\/[^/]+\/campaigns\/([^/]+)/)
  return m ? m[1] : null
}

export function getBrandSection() {
  const m = (window.location.pathname || '').match(/^\/app\/brands\/[^/]+\/([^/]+)/)
  return m ? m[1] : null
}

export function getWorkflowId() {
  const m = (window.location.pathname || '').match(/^\/app\/brands\/[^/]+\/studio\/workflow\/([^/]+)/)
  return m ? m[1] : null
}

export const sc    = s => s >= 7 ? PALETTE.data.positivo    : s >= 5 ? PALETTE.data.atencao    : PALETTE.data.critico;
export const scBg  = s => s >= 7 ? PALETTE.data.positivoFraco: s >= 5 ? PALETTE.data.atencaoFraco: PALETTE.data.criticoFraco;
export const scTxt = s => s >= 7 ? PALETTE.data.positivoDim : s >= 5 ? "#92400e"   : "#72243E";

export const fmtDate = iso => new Date(iso).toLocaleDateString("pt-BR", {
  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
});

export const MACRO_SETORES = [
  "Tecnologia", "Saúde", "Educação", "Finanças", "Varejo",
  "Fashion", "Indústria", "Serviços", "Alimentação", "Imóveis",
  "Logística", "Mídia", "Energia", "Agronegócio", "Outro",
];

export function normalizeSector(setor) {
  if (!setor) return "Outro";
  if (MACRO_SETORES.includes(setor)) return setor;
  const s = setor.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/tech|software|saas|\bti\b|t\.i|digital|dados|\bia\b|intelig|cyber|cloud|startup|\bapp\b|aplicat|sistema/.test(s)) return "Tecnologia";
  if (/saude|medic|hospit|clinic|plano|farmac|biotech|dental|psicol|nutri|fisio|suplemento|laborat|odonto/.test(s)) return "Saúde";
  if (/educa|ensino|escola|facul|universid|curso|treinam|capacit|elearning|aprendiz/.test(s)) return "Educação";
  if (/banco|financ|credito|fintech|seguro|investi|capital|asset|bolsa|pagam|previdenc|corretora/.test(s)) return "Finanças";
  if (/moda|fashion|roupa|vestuario|otica|acessorio|calcado|textil|luxo|joias|bijuteria/.test(s)) return "Fashion";
  if (/varejo|loja|comercio|ecommerce|e-commerce|marketplace|distribui|atacado|supermercado|retai/.test(s)) return "Varejo";
  if (/industria|manufatura|fabrica|producao|montagem|siderurgia|metalurgia|quimica|petrol|plastico/.test(s)) return "Indústria";
  if (/aliment|bebida|restaur|\bfood\b|refeicao|cafe|padaria|laticinio|frigorif|snack/.test(s)) return "Alimentação";
  if (/imobil|constru|incorpora|\bimovel\b|arquitet|engenharia civil/.test(s)) return "Imóveis";
  if (/logistic|transport|entrega|frete|supply|cadeia|armazen|courier/.test(s)) return "Logística";
  if (/midia|entretenimento|publicidade|agencia|comunicacao|propaganda|jornal|revista|streaming|content/.test(s)) return "Mídia";
  if (/energia|eletric|solar|renov|gas|minera|petroleo/.test(s)) return "Energia";
  if (/agro|agric|fazenda|rural|pecuaria|safra|fertilizante|hortifruti/.test(s)) return "Agronegócio";
  if (/servico|consultoria|advocacia|contabil|\brh\b|recursos humanos|terceiriza|assessoria/.test(s)) return "Serviços";
  return setor;
}

export function tryParseJSON(txt) {
  if (!txt) return null;
  let s = txt.replace(/^```[a-z]*\n?/im, "").replace(/\n?```$/im, "").trim();
  try { const r = JSON.parse(s); if (r.empresa) return r; } catch {}
  const j0 = s.indexOf("{"), j1 = s.lastIndexOf("}");
  if (j0 >= 0 && j1 > j0) {
    try { const r = JSON.parse(s.slice(j0, j1 + 1)); if (r.empresa) return r; } catch {}
  }
  return null;
}

export function calcularScoreLead(sol) {
  let score = 0;
  if (sol.email?.includes(".com.br") || sol.email?.includes("@") && !sol.email?.includes("gmail") && !sol.email?.includes("hotmail") && !sol.email?.includes("yahoo")) score += 30;
  if (sol.cargo && ["CMO", "Diretor de Marketing", "VP Marketing", "CEO"].includes(sol.cargo)) score += 25;
  if (sol.site) score += 15;
  if (sol.contexto && sol.contexto.length > 50) score += 20;
  if (sol.setor) score += 10;
  return Math.min(score, 100);
}

/* ─── Manual da marca: tamanho ────────────────────────────────────────
   Teto do bucket `brand-manuals` (migration 013). Decisão de 17/08/2026:
   manter em 50 MB e orientar a reduzir, em vez de subir o limite.

   O conselho mudou junto com a extração. Antes o PDF ia em base64 dentro da
   mensagem e comprimir ajudava a caber. Hoje ele sobe pela Files API e é LIDO
   como documento visual — comprimir joga fora justamente a resolução de onde
   saem logo, paleta e tipografia. Quem não couber, divide; não espreme. */
export const MANUAL_MAX_MB = 50;

export function checarTamanhoManual(file) {
  const mb = (file?.size || 0) / 1024 / 1024;
  if (mb <= MANUAL_MAX_MB) return null;
  return `O PDF tem ${mb.toFixed(1)} MB e o limite é ${MANUAL_MAX_MB} MB. `
    + `Divida o manual em partes e suba uma de cada vez — cada parte é lida por inteiro. `
    + `Evite comprimir: é das páginas que a leitura tira logo, paleta e tipografia.`;
}

export function checkPlano(workspace, feature) {
  const plano = workspace?.plano || 'trial';
  const ordem = ['trial', 'starter', 'pro', 'enterprise'];
  const idx = ordem.indexOf(plano);
  const req = { 'evolucao': 1, 'listening': 2, 'concorrentes': 1, 'relatorio-mensal': 1 };
  return idx >= (req[feature] ?? 0);
}

// ── Senha temporária de primeiro acesso / redefinição ────────────────
// Vive aqui porque nasceu duplicada em dois lugares (admin e Gestão de time),
// e senha gerada de dois jeitos diferentes é duas superfícies para revisar.
//
// A primeira versão usava `Math.floor(Math.random() * n)`. `Math.random()` é um
// PRNG rápido e PREVISÍVEL: observando algumas saídas dá para reconstruir o
// estado interno e prever as próximas. Para embaralhar uma lista tanto faz;
// para gerar a credencial de acesso de um cliente, não.
//
// Sem caracteres ambíguos (l/1/I, O/0): esta senha vai ser lida em voz alta ou
// copiada à mão mais vezes do que gostaríamos.
export function novaSenha(tamanho = 12) {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint32Array(tamanho);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}
