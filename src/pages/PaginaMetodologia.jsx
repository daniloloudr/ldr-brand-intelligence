import { DS, F, PRATICAS } from "../lib/constants";
import { GlobalStyle } from "../components/GlobalStyle";
import { Card } from "../components/Card";
import { Lbl } from "../components/Lbl";
import { Bar } from "../components/Bar";
import { PublicHeader } from "../components/PublicHeader";
import { PublicFooter } from "../components/PublicFooter";

const SCORES = [
  {
    key: "singularidade",
    label: "Score de Singularidade",
    desc: "Mede o grau de diferenciação e unicidade da marca no mercado.",
    detail: "O agent analisa o posicionamento declarado, a narrativa do site, a comunicação em redes sociais e compara com o território dos concorrentes diretos. Avalia se a marca reivindica um espaço único e inimitável — ou se é mais do mesmo.",
    color: DS.green,
    sources: ["Site institucional", "LinkedIn", "Instagram", "Análise de concorrentes", "SERPs"],
  },
  {
    key: "consistencia",
    label: "Score de Consistência",
    desc: "Avalia a coerência entre identidade declarada e percebida.",
    detail: "Cruza o que a marca diz ser (site, comunicação) com o que o mercado percebe (Google Reviews, Reclame Aqui, Glassdoor, comentários em redes). Contradições entre intenção e percepção reduzem este score.",
    color: DS.pink,
    sources: ["Google Reviews", "Reclame Aqui", "Glassdoor", "Comentários em redes", "Anúncios ativos"],
  },
  {
    key: "posicionamento",
    label: "Score de Posicionamento",
    desc: "Mede a clareza estratégica e a força do território de marca.",
    detail: "Avalia a nitidez da proposta de valor, a coerência entre os canais de comunicação e se a marca sabe — e comunica — exatamente para quem e por quê existe. Um posicionamento vago ou genérico recebe score baixo.",
    color: DS.amber,
    sources: ["Site e narrativa principal", "Anúncios pagos", "SEO e SERPs", "Tone of voice", "Vagas abertas"],
  },
];

const TIERS = [
  { range:"1–3",  label:"Crítico",            color:DS.pink,   bg:DS.pinkPale,   desc:"A marca não tem território claro, é inconsistente ou praticamente invisível. Intervenção estratégica urgente." },
  { range:"4–6",  label:"Em desenvolvimento", color:DS.amber,  bg:DS.amberPale,  desc:"Existe uma direção, mas ainda fragmentada. A marca tem potencial mas não explora sua singularidade com consistência." },
  { range:"7–8",  label:"Sólido",             color:DS.green,  bg:DS.greenPale,  desc:"Marca com posicionamento claro, coerência e diferenciação percebida. Poucas brechas estratégicas importantes." },
  { range:"9–10", label:"Referência",         color:"#7F77DD", bg:"#EEECFB",     desc:"Marca de referência no seu território. Singularidade reconhecida, consistência alta e posicionamento incontestável." },
];

const FONTES = [
  { icon:"🌐", label:"Site institucional",    desc:"Narrativa, proposta de valor, linguagem e estrutura." },
  { icon:"💼", label:"LinkedIn",              desc:"Cultura, posicionamento B2B, tom e vagas abertas." },
  { icon:"📸", label:"Instagram e redes",     desc:"Identidade visual, storytelling e engajamento." },
  { icon:"⭐", label:"Google Reviews",        desc:"Percepção real de clientes e reputação pública." },
  { icon:"📣", label:"Reclame Aqui",          desc:"Volume e qualidade do atendimento, crises e reputação." },
  { icon:"👥", label:"Glassdoor",             desc:"Cultura interna, valores e como a empresa trata talentos." },
  { icon:"📢", label:"Anúncios ativos",       desc:"O que a marca prioriza pagar para comunicar." },
  { icon:"🔍", label:"SERPs e SEO",           desc:"Como o mercado encontra e enquadra a marca organicamente." },
];

export function PaginaMetodologia() {
  return (
    <div style={{ minHeight:"100vh", background:DS.offwhite, fontFamily:F }}>
      <GlobalStyle />

      <PublicHeader sticky>
        <button
          onClick={() => window.history.back()}
          style={{ background:"none", border:"1px solid #1E3348", padding:"8px 18px", fontSize:10, fontWeight:700, letterSpacing:"0.14em", textTransform:"uppercase", color:"#7A8899", cursor:"pointer", fontFamily:"'Cairo', sans-serif" }}
        >
          ← Voltar
        </button>
      </PublicHeader>

      <div style={{ maxWidth:800, margin:"0 auto", padding:"48px 20px 80px" }}>

        {/* Hero */}
        <div style={{ marginBottom:40 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", color:DS.green, textTransform:"uppercase", marginBottom:10 }}>Como calculamos</div>
          <h1 style={{ fontSize:34, fontWeight:900, color:DS.navy, letterSpacing:"-0.03em", lineHeight:1.15, marginBottom:16 }}>
            Metodologia Smart Branding
          </h1>
          <p style={{ fontSize:15, color:DS.textMid, lineHeight:1.8, maxWidth:600 }}>
            Os scores são gerados por um agent de IA que pesquisa ativamente dados públicos da marca e aplica o framework proprietário da LOUDR — Smart Branding. Nenhum dado é inventado: tudo vem de fontes reais e verificáveis.
          </p>
        </div>

        {/* Framework */}
        <div style={{ marginBottom:36 }}>
          <Lbl color={DS.textLight}>O framework</Lbl>
          <Card style={{ marginBottom:14, background:DS.navy }}>
            <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", color:DS.green, textTransform:"uppercase", marginBottom:12 }}>Smart Branding</div>
            <p style={{ fontSize:14, color:"#c9d8e8", lineHeight:1.75, marginBottom:20 }}>
              Smart Branding é o encontro de três forças — <span style={{ color:DS.white, fontWeight:700 }}>Estratégia</span>, <span style={{ color:DS.white, fontWeight:700 }}>Design</span> e <span style={{ color:DS.white, fontWeight:700 }}>Tecnologia</span> — que define que identidade de marca não é só comunicação: está em tudo que a empresa faz.
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:8 }}>
              {PRATICAS.map(p => (
                <div key={p.key} style={{ background:DS.navyMid, borderRadius:8, padding:"12px 14px", borderLeft:`3px solid ${p.color}` }}>
                  <div style={{ fontSize:12, fontWeight:700, color:p.color, marginBottom:3 }}>{p.label}</div>
                  <div style={{ fontSize:11, color:DS.gray }}>{p.sub}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Os 3 scores */}
        <div style={{ marginBottom:36 }}>
          <Lbl color={DS.textLight}>Os 3 scores principais</Lbl>
          <p style={{ fontSize:13, color:DS.textLight, marginBottom:16 }}>
            Cada diagnóstico gera três scores de 1 a 10. O score médio geral é a média aritmética dos três.
          </p>
          {SCORES.map((s, i) => (
            <Card key={s.key} style={{ marginBottom:10, borderLeft:`3px solid ${s.color}`, borderRadius:"0 12px 12px 0" }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16, flexWrap:"wrap" }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:800, color:DS.navy, marginBottom:4 }}>{s.label}</div>
                  <p style={{ fontSize:13, color:DS.textMid, lineHeight:1.7, marginBottom:12 }}>{s.desc}</p>
                  <p style={{ fontSize:12, color:DS.textLight, lineHeight:1.7, marginBottom:12 }}>{s.detail}</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {s.sources.map(src => (
                      <span key={src} style={{ fontSize:11, fontWeight:600, padding:"2px 8px", borderRadius:99, background:s.color+"18", color:s.color }}>{src}</span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Escala de maturidade */}
        <div style={{ marginBottom:36 }}>
          <Lbl color={DS.textLight}>Escala de maturidade</Lbl>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:10 }}>
            {TIERS.map(t => (
              <div key={t.range} style={{ background:t.bg, borderRadius:10, padding:"16px 18px", border:`1px solid ${t.color}33` }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:t.color }} />
                  <span style={{ fontSize:22, fontWeight:900, color:t.color }}>{t.range}</span>
                </div>
                <div style={{ fontSize:13, fontWeight:800, color:DS.navy, marginBottom:6 }}>{t.label}</div>
                <p style={{ fontSize:12, color:DS.textMid, lineHeight:1.6 }}>{t.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Fontes de pesquisa */}
        <div style={{ marginBottom:36 }}>
          <Lbl color={DS.textLight}>Fontes de pesquisa</Lbl>
          <p style={{ fontSize:13, color:DS.textLight, marginBottom:16 }}>
            O agent pesquisa ativamente 8 fontes públicas antes de calcular os scores.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:8 }}>
            {FONTES.map(f => (
              <div key={f.label} style={{ background:DS.white, border:`1px solid ${DS.border}`, borderRadius:10, padding:"12px 14px", display:"flex", gap:10, alignItems:"flex-start" }}>
                <span style={{ fontSize:18 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:DS.navy, marginBottom:2 }}>{f.label}</div>
                  <div style={{ fontSize:11, color:DS.textLight, lineHeight:1.5 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Limitações */}
        <Card style={{ background:DS.amberPale, border:`1px solid ${DS.amber}44` }}>
          <Lbl color="#92400e">Limitações importantes</Lbl>
          <ul style={{ margin:0, paddingLeft:18 }}>
            {[
              "Os scores refletem dados públicos disponíveis no momento da análise — não substituem uma auditoria estratégica aprofundada.",
              "Empresas com baixa presença digital podem ter scores subestimados por falta de dados rastreáveis.",
              "O diagnóstico é um retrato de momento, não uma avaliação permanente da marca.",
              "Scores altos indicam boa saúde de marca percebida — não garantem desempenho financeiro.",
            ].map((l, i) => (
              <li key={i} style={{ fontSize:13, color:"#78350f", lineHeight:1.75, marginBottom:4 }}>{l}</li>
            ))}
          </ul>
        </Card>

      </div>
      <PublicFooter />
    </div>
  );
}
