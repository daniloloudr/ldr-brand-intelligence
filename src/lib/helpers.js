import { DS } from "./constants";

// ─── Multitenant por subdomínio (nomedamarca.s1ngulr.com) ────────────
// Decisão 2026-07-20: o subdomínio é camada de RESOLUÇÃO + branding; o RLS por
// workspace_id segue sendo o perímetro real de segurança. Sistema = app./www./apex.
// Local (sem subdomínio): usar ?tenant=slug para simular.
export const ROOT_DOMAIN = 's1ngulr.com';
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

// URL de acesso do cliente (subdomínio da marca em produção)
export const tenantUrl = (slug) => `https://${slug}.${ROOT_DOMAIN}`;

// slugify — mesma lógica da migration 044 (minúsculas, sem acento, hífens)
export function slugify(nome) {
  return (nome || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export function getRoute() {
  const h = window.location.hash;
  if (!h || h === '#/')              return 'login';
  if (h === '#/metodologia')         return 'metodologia';
  if (h.startsWith('#/relatorio/'))  return 'relatorio-publico';
  if (h === '#/login')               return 'login';
  if (h === '#/app')                 return 'app-home';
  if (h === '#/app/posicionamento')  return 'posicionamento';
  // legacy redirects mantidos temporariamente
  if (h === '#/app/diagnostico')     return 'posicionamento';
  if (h === '#/app/evolucao')        return 'posicionamento';
  if (h === '#/app/concorrentes')    return 'posicionamento';
  if (h === '#/app/listening')       return 'listening';
  if (h === '#/app/content-hub')     return 'content-hub';
  if (h === '#/app/market-intel')    return 'market-intel';
  if (h === '#/app/insights')        return 'insights';
  if (h === '#/app/competitors')     return 'competitors';
  if (h === '#/app/trends')          return 'trends';
  if (h === '#/app/reports')         return 'reports';
  if (h === '#/app/workspace')       return 'workspace';
  if (h === '#/app/conta')           return 'conta';
  if (h === '#/app/time')            return 'time';
  if (h === '#/app/plano')           return 'plano';
  if (h === '#/app/alertas')         return 'alertas';
  if (h === '#/app/ia-loudr')        return 'ia-loudr';
  if (h === '#/app/brands')                                        return 'brands-list';
  if (h === '#/app/brands/new')                                    return 'brands-new';
  if (h.match(/^#\/app\/brands\/[^/]+\/assistant/))               return 'brands-assistant';
  if (h.match(/^#\/app\/brands\/[^/]+\/campaigns\/new/))          return 'brands-campaign-new';
  if (h.match(/^#\/app\/brands\/[^/]+\/campaigns\/[^/]+/))        return 'brands-campaign-detail';
  if (h.match(/^#\/app\/brands\/[^/]+\/campaigns/))               return 'brands-campaigns';
  if (h.match(/^#\/app\/brands\/[^/]+\/studio\/campanhas/))       return 'brands-studio-campaigns';
  if (h.match(/^#\/app\/brands\/[^/]+\/studio\/workflow/))        return 'brands-studio-workflow';
  if (h.match(/^#\/app\/brands\/[^/]+\/studio\/video/))           return 'brands-studio-video';
  if (h.match(/^#\/app\/brands\/[^/]+\/studio\/writing/))         return 'brands-studio-writing';
  if (h.match(/^#\/app\/brands\/[^/]+\/studio\/biblioteca/))      return 'brands-studio-biblioteca';
  if (h.match(/^#\/app\/brands\/[^/]+\/studio\/assets/))          return 'brands-studio-assets';
  if (h.match(/^#\/app\/brands\/[^/]+\/studio\/approvals/))       return 'brands-studio-approvals';
  if (h.match(/^#\/app\/brands\/[^/]+\/studio/))                  return 'brands-studio';
  if (h.startsWith('#/app/brands/'))                               return 'brands-detail';
  if (h === '#/admin')               return 'admin';
  if (h === '#/admin/historico')     return 'admin-historico';
  return 'public';
}

export function getBrandId() {
  const h = window.location.hash;
  const m = h.match(/^#\/app\/brands\/([^/]+)/)
  return m ? m[1] : null
}

export function getCampaignId() {
  const h = window.location.hash;
  const m = h.match(/^#\/app\/brands\/[^/]+\/campaigns\/([^/]+)/)
  return m ? m[1] : null
}

export function getBrandSection() {
  const h = window.location.hash;
  const m = h.match(/^#\/app\/brands\/[^/]+\/([^/]+)/)
  return m ? m[1] : null
}

export function getWorkflowId() {
  const h = window.location.hash;
  const m = h.match(/^#\/app\/brands\/[^/]+\/studio\/workflow\/([^/]+)/)
  return m ? m[1] : null
}

export const sc    = s => s >= 7 ? DS.green    : s >= 5 ? DS.amber    : DS.pink;
export const scBg  = s => s >= 7 ? DS.greenPale: s >= 5 ? DS.amberPale: DS.pinkPale;
export const scTxt = s => s >= 7 ? DS.greenDim : s >= 5 ? "#92400e"   : "#72243E";

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

export function checkPlano(workspace, feature) {
  const plano = workspace?.plano || 'trial';
  const ordem = ['trial', 'starter', 'pro', 'enterprise'];
  const idx = ordem.indexOf(plano);
  const req = { 'evolucao': 1, 'listening': 2, 'concorrentes': 1, 'relatorio-mensal': 1 };
  return idx >= (req[feature] ?? 0);
}
