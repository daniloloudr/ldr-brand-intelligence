import { DS } from "./constants";

export function getRoute() {
  const h = window.location.hash;
  if (!h || h === '#/')              return 'public';
  if (h === '#/metodologia')         return 'metodologia';
  if (h.startsWith('#/relatorio/'))  return 'relatorio-publico';
  if (h === '#/login')               return 'login';
  if (h === '#/register')            return 'register';
  if (h === '#/onboarding')          return 'onboarding';
  if (h === '#/app')                 return 'app-home';
  if (h === '#/app/diagnostico')     return 'diagnostico';
  if (h === '#/app/evolucao')        return 'evolucao';
  if (h === '#/app/listening')       return 'listening';
  if (h === '#/app/concorrentes')    return 'concorrentes';
  if (h === '#/app/workspace')       return 'workspace';
  if (h === '#/app/brands')                           return 'brands-list';
  if (h === '#/app/brands/new')                       return 'brands-new';
  if (h.match(/^#\/app\/brands\/[^/]+\/assistant/))   return 'brands-assistant';
  if (h.startsWith('#/app/brands/'))                  return 'brands-detail';
  if (h === '#/admin')               return 'admin';
  if (h === '#/admin/historico')     return 'admin-historico';
  return 'public';
}

export function getBrandId() {
  const h = window.location.hash;
  const m = h.match(/^#\/app\/brands\/([^/]+)/)
  return m ? m[1] : null
}

export function getBrandSection() {
  const h = window.location.hash;
  const m = h.match(/^#\/app\/brands\/[^/]+\/([^/]+)/)
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
  const req = { 'evolucao': 1, 'listening': 2, 'concorrentes': 2, 'relatorio-mensal': 1 };
  return idx >= (req[feature] ?? 0);
}
