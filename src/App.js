import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_KEY
);

const SYSTEM_PROMPT = `Você é o Brand Intelligence Agent da LOUDR — agência de Smart Branding que conecta estratégia, design e tecnologia.

A LOUDR opera por um framework proprietário chamado Smart Branding, que define que identidade de marca não é só comunicação — está em tudo que a empresa faz. Smart Branding é o encontro de três forças:
- ESTRATÉGIA: posicionamento, singularidade, arquitetura de marca, cultura
- DESIGN: identidade visual e verbal, design system, experiência, storytelling
- TECNOLOGIA: produto digital, plataformas, dados, growth, AI

Esse encontro se manifesta em 4 práticas:
1. INTELIGÊNCIA & SINGULARIDADE — posicionamento, arquitetura de marca, cultura e essência.
2. EXPERIÊNCIA & EXPRESSÃO — identidade visual/verbal, storytelling, design system.
3. PLATAFORMAS & ECOSSISTEMAS — produto digital, e-commerce, plataformas, integrações.
4. FUTURO & ESCALA — data, AI, growth branding, CRM, performance.

Pesquise ativamente na web: site oficial, LinkedIn, Instagram, Google Reviews, Reclame Aqui, notícias, vagas abertas, Glassdoor, anúncios ativos, SERPs.

Responda SOMENTE com JSON válido, sem texto antes ou depois, sem markdown:

{
  "empresa": "Nome",
  "dominio": "dominio.com.br",
  "setor": "Setor",
  "porte": "Startup/PME/Médio/Grande",
  "momento_atual": "1-2 frases sobre o momento estratégico",
  "frase_diagnostico": "Frase provocativa e memorável sobre o problema central",
  "resumo_executivo": "3-4 frases com insight central, voz LOUDR: direto, sem eufemismos",
  "identidade_declarada": "O que a empresa diz sobre si com dados reais",
  "identidade_percebida": "O que o mercado percebe com evidências concretas",
  "gap_identidade": "Contradição específica entre intenção e percepção",
  "praticas_loudr": {
    "inteligencia_singularidade": { "score": 6, "diagnostico": "A marca tem território único?", "evidencias": "Dados concretos", "oportunidade": "O que a LOUDR faria" },
    "experiencia_expressao":      { "score": 5, "diagnostico": "Identidade visual, verbal, storytelling", "evidencias": "Dados concretos", "oportunidade": "O que a LOUDR faria" },
    "plataformas_ecossistemas":   { "score": 7, "diagnostico": "Presença digital, produto, UX", "evidencias": "Dados concretos", "oportunidade": "O que a LOUDR faria" },
    "futuro_escala":              { "score": 4, "diagnostico": "Data, growth, SEO, performance", "evidencias": "Dados concretos", "oportunidade": "O que a LOUDR faria" }
  },
  "score_singularidade": 6,
  "score_consistencia": 7,
  "score_posicionamento": 5,
  "justificativa_scores": "Parágrafo com dados reais",
  "sinais_cultura": "O que vagas e Glassdoor revelam",
  "sinais_investimento": "Para onde estão direcionando energia",
  "evolucao_marca": "Como a marca mudou — estratégico ou reativo?",
  "gap_ads_vs_site": "O que anúncios revelam vs narrativa do site",
  "diferenciais_ativos": ["diferencial 1", "diferencial 2", "diferencial 3"],
  "zona_ruido": ["problema 1", "problema 2", "problema 3"],
  "territorio_inexplorado": "O que pode reivindicar que nenhum concorrente reivindica",
  "pergunta_provocativa": "Se sumisse amanhã, alguém sentiria falta? Responda diretamente.",
  "concorrentes": [
    {"nome": "A", "diferencial": "O que os distingue", "ameaca": "baixa/media/alta", "sinal": "Dado recente"},
    {"nome": "B", "diferencial": "O que os distingue", "ameaca": "baixa/media/alta", "sinal": "Dado recente"},
    {"nome": "C", "diferencial": "O que os distingue", "ameaca": "baixa/media/alta", "sinal": "Dado recente"}
  ],
  "oportunidades": [
    {"titulo": "Título", "descricao": "O que fazer e por quê", "pratica_loudr": "inteligencia_singularidade", "impacto": "alto", "prazo": "imediato"},
    {"titulo": "Título", "descricao": "O que fazer e por quê", "pratica_loudr": "experiencia_expressao", "impacto": "medio", "prazo": "curto"},
    {"titulo": "Título", "descricao": "O que fazer e por quê", "pratica_loudr": "futuro_escala", "impacto": "alto", "prazo": "médio prazo"}
  ],
  "quick_wins": ["Ação 1", "Ação 2", "Ação 3"],
  "porta_entrada_loudr": "Qual prática é a porta de entrada natural e por quê"
}

REGRAS: scores 1-3 crítico, 4-6 em desenvolvimento, 7-8 sólido, 9-10 referência. Use apenas dados reais.`;

// ─── Design System ────────────────────────────────────────────────────────────
const DS = {
  navy:"#0D1B2A", navyMid:"#162840", navyLight:"#1E3550",
  green:"#0D9E7A", greenDim:"#0B8567", greenPale:"#E1F5EE",
  pink:"#E8185A", pinkPale:"#FBEAF0",
  white:"#FFFFFF", offwhite:"#F7F9F8",
  border:"#E2EBE8", gray:"#8A9AB0", grayLight:"#F0F4F3",
  text:"#0D1B2A", textMid:"#4A5A6A", textLight:"#8A9AB0",
  amber:"#EF9F27", amberPale:"#FEF3C7", purple:"#7F77DD",
};
const F = "'Cairo', sans-serif";

const PRATICAS = [
  { key:"inteligencia_singularidade", label:"Inteligência & Singularidade", sub:"Posicionamento · Arquitetura · Cultura", color:DS.green },
  { key:"experiencia_expressao",      label:"Experiência & Expressão",      sub:"Identidade · Design · Storytelling",  color:DS.pink },
  { key:"plataformas_ecossistemas",   label:"Plataformas & Ecossistemas",   sub:"Produto · Digital · Engenharia",      color:DS.purple },
  { key:"futuro_escala",              label:"Futuro & Escala",              sub:"Data · AI · Growth · Performance",    color:DS.amber },
];

const STEPS = [
  "Buscando site e presença digital",
  "Analisando LinkedIn, redes e tone of voice",
  "Pesquisando vagas, Glassdoor e cultura",
  "Verificando reviews e reputação pública",
  "Mapeando concorrentes e anúncios ativos",
  "Aplicando framework Smart Branding",
  "Gerando diagnóstico das 4 práticas LOUDR",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sc    = s => s >= 7 ? DS.green    : s >= 5 ? DS.amber    : DS.pink;
const scBg  = s => s >= 7 ? DS.greenPale: s >= 5 ? DS.amberPale: DS.pinkPale;
const scTxt = s => s >= 7 ? DS.greenDim : s >= 5 ? "#92400e"   : "#72243E";
const fmtDate = iso => new Date(iso).toLocaleDateString("pt-BR", {
  day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit"
});

function Bar({ score, color }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
      <div style={{ flex:1, height:5, background:DS.border, borderRadius:3, overflow:"hidden" }}>
        <div style={{ width:`${score*10}%`, height:"100%", background:color, borderRadius:3, transition:"width 1.4s cubic-bezier(.22,1,.36,1)" }} />
      </div>
      <span style={{ fontSize:15, fontWeight:900, color, minWidth:20, textAlign:"right", fontFamily:F }}>{score}</span>
    </div>
  );
}

function Pill({ children, bg, color }) {
  return <span style={{ display:"inline-block", fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:99, background:bg, color, fontFamily:F }}>{children}</span>;
}

const ipill = v =>
  v==="alto"  ? <Pill bg={DS.greenPale} color={DS.greenDim}>impacto alto</Pill> :
  v==="medio" ? <Pill bg={DS.amberPale} color="#92400e">impacto médio</Pill> :
                <Pill bg={DS.grayLight}  color={DS.textMid}>impacto baixo</Pill>;

const apill = v =>
  v==="alta"  ? <Pill bg={DS.pinkPale}  color={DS.pink}>ameaça alta</Pill> :
  v==="media" ? <Pill bg={DS.amberPale} color="#92400e">ameaça média</Pill> :
                <Pill bg={DS.grayLight}  color={DS.textMid}>ameaça baixa</Pill>;

const ppill = key => {
  const p = PRATICAS.find(p => p.key === key);
  return p ? <Pill bg={p.color+"22"} color={p.color}>{p.label}</Pill> : null;
};

function Lbl({ children, color=DS.green }) {
  return <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color, marginBottom:10, fontFamily:F }}>{children}</div>;
}

function Card({ children, className="", style={} }) {
  return <div className={className} style={{ background:DS.white, border:`1px solid ${DS.border}`, borderRadius:12, padding:"20px 24px", ...style }}>{children}</div>;
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav({ user, page, onNavigate, onLogout, histCount }) {
  return (
    <nav style={{ position:"sticky", top:0, zIndex:10, background:DS.white, borderBottom:`1px solid ${DS.border}`, padding:"0 28px", height:56, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={() => onNavigate("home")}>
        <div style={{ width:10, height:10, background:DS.pink }} />
        <span style={{ fontSize:16, fontWeight:900, color:DS.navy, letterSpacing:"-0.02em" }}>LOUDR</span>
        <span style={{ fontSize:12, color:DS.textLight, fontWeight:500 }}>Brand Intelligence</span>
      </div>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:12, color:DS.textLight }}>{user?.email}</span>
        <button onClick={() => onNavigate(page === "historico" || page === "relatorio" ? "home" : "historico")}
          style={{
            background: (page==="historico"||page==="relatorio") ? DS.navy : "none",
            color: (page==="historico"||page==="relatorio") ? DS.white : DS.textMid,
            border: `1px solid ${(page==="historico"||page==="relatorio") ? DS.navy : DS.border}`,
            borderRadius:8, padding:"5px 14px", fontSize:12, fontFamily:F,
            cursor:"pointer", display:"flex", alignItems:"center", gap:6,
          }}>
          Histórico
          {histCount > 0 && (
            <span style={{ background:(page==="historico"||page==="relatorio")?DS.green:DS.navy, color:DS.white, borderRadius:99, fontSize:10, fontWeight:700, padding:"1px 6px" }}>
              {histCount}
            </span>
          )}
        </button>
        <button onClick={onLogout} style={{ background:"none", border:`1px solid ${DS.border}`, borderRadius:8, padding:"5px 12px", fontSize:12, color:DS.textLight, cursor:"pointer", fontFamily:F }}>
          Sair
        </button>
      </div>
    </nav>
  );
}

// ─── Relatório completo (reutilizável) ────────────────────────────────────────
function RelatorioCompleto({ data, onBack, backLabel="← Voltar", meta=null }) {
  return (
    <div>
      {/* Breadcrumb / meta do histórico */}
      {meta && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:10 }}>
          <button onClick={onBack} style={{ background:"none", border:"none", color:DS.textLight, cursor:"pointer", fontSize:13, fontFamily:F, padding:0 }}>
            {backLabel}
          </button>
          <div style={{ fontSize:12, color:DS.textLight, textAlign:"right" }}>
            <span>Gerado em {fmtDate(meta.created_at)}</span>
            {meta.user_name && <span> · por {meta.user_name}</span>}
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="a0" style={{ background:DS.navy, borderRadius:16, padding:"30px 34px", marginBottom:14, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", right:-24, top:-24, width:200, height:200, borderRadius:"50%", background:DS.green, opacity:0.05 }} />
        <div style={{ width:14, height:14, background:DS.pink, marginBottom:16 }} />
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", color:DS.green, marginBottom:8, textTransform:"uppercase" }}>
          Brand Intelligence Report · LOUDR · Smart Branding
        </div>
        <h2 style={{ fontSize:30, fontWeight:900, color:DS.white, letterSpacing:"-0.03em", marginBottom:4 }}>{data.empresa}</h2>
        <div style={{ fontSize:13, color:DS.gray, marginBottom:8 }}>{data.setor} · {data.porte} · {data.dominio}</div>
        {data.momento_atual && <div style={{ fontSize:13, color:"#a0b8c8", marginBottom:20, fontStyle:"italic" }}>{data.momento_atual}</div>}
        <div style={{ borderLeft:`3px solid ${DS.green}`, paddingLeft:16, fontStyle:"italic", fontSize:15, color:"#c9d8e8", lineHeight:1.65 }}>
          "{data.frase_diagnostico}"
        </div>
      </div>

      <Card className="a1" style={{ marginBottom:14 }}>
        <Lbl color={DS.textLight}>Resumo executivo</Lbl>
        <p style={{ fontSize:14, color:DS.textMid, lineHeight:1.8 }}>{data.resumo_executivo}</p>
      </Card>

      {/* 4 Práticas */}
      <div className="a2" style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:DS.textLight, marginBottom:12, fontFamily:F }}>
          Diagnóstico por prática Smart Branding
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(360px, 1fr))", gap:10 }}>
          {PRATICAS.map(p => {
            const pr = data.praticas_loudr?.[p.key];
            if (!pr) return null;
            return (
              <div key={p.key} style={{ background:DS.white, border:`1px solid ${DS.border}`, borderRadius:12, padding:"18px 20px", borderTop:`3px solid ${p.color}` }}>
                <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:12, marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:800, color:DS.text, marginBottom:2 }}>{p.label}</div>
                    <div style={{ fontSize:11, color:DS.textLight }}>{p.sub}</div>
                  </div>
                  <div style={{ flexShrink:0, minWidth:80 }}><Bar score={pr.score} color={p.color} /></div>
                </div>
                <p style={{ fontSize:13, color:DS.textMid, lineHeight:1.65, marginBottom:10 }}>{pr.diagnostico}</p>
                {pr.evidencias && (
                  <div style={{ background:DS.grayLight, borderRadius:8, padding:"8px 12px", marginBottom:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:DS.textLight, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>Evidências</div>
                    <p style={{ fontSize:12, color:DS.textMid, lineHeight:1.55 }}>{pr.evidencias}</p>
                  </div>
                )}
                {pr.oportunidade && (
                  <div style={{ borderLeft:`2px solid ${p.color}`, paddingLeft:10 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:p.color, letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:3 }}>O que a LOUDR faria</div>
                    <p style={{ fontSize:12, color:DS.textMid, lineHeight:1.55, fontStyle:"italic" }}>{pr.oportunidade}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scores */}
      <div className="a3" style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:10, marginBottom:14 }}>
        {[
          { label:"Singularidade",  key:"score_singularidade",  desc:"Diferenciação no mercado" },
          { label:"Consistência",   key:"score_consistencia",   desc:"Coerência da identidade" },
          { label:"Posicionamento", key:"score_posicionamento", desc:"Clareza da proposta de valor" },
        ].map(s => (
          <Card key={s.key}>
            <div style={{ fontSize:13, fontWeight:700, color:DS.text, marginBottom:2 }}>{s.label}</div>
            <div style={{ fontSize:11, color:DS.textLight, marginBottom:12 }}>{s.desc}</div>
            <Bar score={data[s.key]} color={sc(data[s.key])} />
          </Card>
        ))}
      </div>

      <div className="a3" style={{ background:DS.grayLight, border:`1px solid ${DS.border}`, borderRadius:12, padding:"16px 20px", marginBottom:14 }}>
        <Lbl color={DS.textLight}>Por que esses scores</Lbl>
        <p style={{ fontSize:13, color:DS.textMid, lineHeight:1.7 }}>{data.justificativa_scores}</p>
      </div>

      {/* Identidade */}
      <div className="a4" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        {[
          { label:"Identidade declarada", key:"identidade_declarada", accent:DS.green },
          { label:"Identidade percebida", key:"identidade_percebida", accent:DS.pink },
        ].map(b => (
          <Card key={b.key} style={{ borderTop:`3px solid ${b.accent}`, borderRadius:"0 0 12px 12px" }}>
            <Lbl color={b.accent}>{b.label}</Lbl>
            <p style={{ fontSize:13, color:DS.textMid, lineHeight:1.7 }}>{data[b.key]}</p>
          </Card>
        ))}
      </div>

      <div className="a4" style={{ background:DS.amberPale, border:`1px solid #FED7AA`, borderLeft:`4px solid ${DS.amber}`, borderRadius:"0 12px 12px 0", padding:"16px 20px", marginBottom:14 }}>
        <Lbl color="#92400e">Gap de identidade</Lbl>
        <p style={{ fontSize:14, color:"#78350f", lineHeight:1.7 }}>{data.gap_identidade}</p>
      </div>

      {/* Sinais */}
      {(data.sinais_cultura || data.sinais_investimento || data.evolucao_marca || data.gap_ads_vs_site) && (
        <div className="a5" style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:DS.textLight, marginBottom:12, fontFamily:F }}>Sinais de inteligência</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(340px, 1fr))", gap:10 }}>
            {data.sinais_cultura      && <Card><Lbl color={DS.purple}>Cultura & vagas</Lbl><p style={{ fontSize:13, color:DS.textMid, lineHeight:1.65 }}>{data.sinais_cultura}</p></Card>}
            {data.sinais_investimento && <Card><Lbl color={DS.amber}>Para onde investem</Lbl><p style={{ fontSize:13, color:DS.textMid, lineHeight:1.65 }}>{data.sinais_investimento}</p></Card>}
            {data.evolucao_marca      && <Card><Lbl color={DS.green}>Evolução da marca</Lbl><p style={{ fontSize:13, color:DS.textMid, lineHeight:1.65 }}>{data.evolucao_marca}</p></Card>}
            {data.gap_ads_vs_site    && <Card><Lbl color={DS.pink}>Anúncios vs. site</Lbl><p style={{ fontSize:13, color:DS.textMid, lineHeight:1.65 }}>{data.gap_ads_vs_site}</p></Card>}
          </div>
        </div>
      )}

      {/* Diferenciais + Ruído */}
      <div className="a5" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
        <Card>
          <Lbl color={DS.greenDim}>Diferenciais ativos</Lbl>
          {data.diferenciais_ativos?.map((d,i) => (
            <div key={i} style={{ display:"flex", gap:10, marginBottom:10 }}>
              <span style={{ color:DS.green, fontWeight:900, flexShrink:0 }}>✓</span>
              <span style={{ fontSize:13, color:DS.textMid, lineHeight:1.55 }}>{d}</span>
            </div>
          ))}
        </Card>
        <Card>
          <Lbl color={DS.pink}>Zona de ruído</Lbl>
          {data.zona_ruido?.map((d,i) => (
            <div key={i} style={{ display:"flex", gap:10, marginBottom:10 }}>
              <span style={{ color:DS.pink, fontWeight:900, flexShrink:0 }}>✕</span>
              <span style={{ fontSize:13, color:DS.textMid, lineHeight:1.55 }}>{d}</span>
            </div>
          ))}
        </Card>
      </div>

      <div className="a6" style={{ background:DS.navy, borderRadius:12, padding:"20px 24px", marginBottom:14 }}>
        <Lbl color={DS.green}>Território inexplorado</Lbl>
        <p style={{ fontSize:15, color:"#d1e8e0", lineHeight:1.7, fontStyle:"italic" }}>{data.territorio_inexplorado}</p>
      </div>

      {data.pergunta_provocativa && (
        <div className="a6" style={{ background:DS.pinkPale, border:`1px solid #F4C0D1`, borderLeft:`4px solid ${DS.pink}`, borderRadius:"0 12px 12px 0", padding:"16px 20px", marginBottom:14 }}>
          <Lbl color={DS.pink}>Se essa marca sumisse amanhã...</Lbl>
          <p style={{ fontSize:14, color:"#4B1528", lineHeight:1.7 }}>{data.pergunta_provocativa}</p>
        </div>
      )}

      {/* Concorrentes */}
      {data.concorrentes?.length > 0 && (
        <Card className="a7" style={{ marginBottom:14 }}>
          <Lbl color={DS.textLight}>Contexto competitivo</Lbl>
          {data.concorrentes.map((c,i) => (
            <div key={i}>
              <div style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"10px 0", flexWrap:"wrap" }}>
                <div style={{ minWidth:130, fontWeight:700, fontSize:13, color:DS.text }}>{c.nome}</div>
                <div style={{ flex:1, minWidth:160 }}>
                  <div style={{ fontSize:13, color:DS.textMid, lineHeight:1.5, marginBottom:c.sinal?4:0 }}>{c.diferencial}</div>
                  {c.sinal && <div style={{ fontSize:11, color:DS.textLight, fontStyle:"italic" }}>↳ {c.sinal}</div>}
                </div>
                <div style={{ flexShrink:0 }}>{apill(c.ameaca)}</div>
              </div>
              {i < data.concorrentes.length-1 && <div style={{ height:1, background:DS.border }} />}
            </div>
          ))}
        </Card>
      )}

      {/* Oportunidades */}
      {data.oportunidades?.length > 0 && (
        <div className="a7" style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:DS.textLight, marginBottom:12, fontFamily:F }}>Oportunidades estratégicas</div>
          {data.oportunidades.map((op,i) => (
            <Card key={i} style={{ marginBottom:10, display:"flex", gap:16 }}>
              <div style={{ width:30, height:30, borderRadius:"50%", background:DS.navy, color:DS.green, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:900, flexShrink:0 }}>{i+1}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
                  <span style={{ fontSize:14, fontWeight:800, color:DS.text }}>{op.titulo}</span>
                  {op.pratica_loudr && ppill(op.pratica_loudr)}
                  {ipill(op.impacto)}
                  <Pill bg={DS.greenPale} color={DS.greenDim}>{op.prazo}</Pill>
                </div>
                <p style={{ fontSize:13, color:DS.textMid, lineHeight:1.65 }}>{op.descricao}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Quick wins */}
      {data.quick_wins?.length > 0 && (
        <div className="a8" style={{ background:DS.greenPale, border:`1px solid #A7DFD0`, borderRadius:12, padding:"18px 22px", marginBottom:14 }}>
          <Lbl color={DS.greenDim}>Quick wins — ações imediatas</Lbl>
          {data.quick_wins.map((qw,i) => (
            <div key={i} style={{ display:"flex", gap:10, marginBottom:10 }}>
              <span style={{ color:DS.green, fontWeight:900, fontSize:16, flexShrink:0 }}>→</span>
              <span style={{ fontSize:13, color:DS.greenDim, lineHeight:1.6, fontWeight:600 }}>{qw}</span>
            </div>
          ))}
        </div>
      )}

      {/* Metodologia */}
      <div className="a8" style={{ background:DS.grayLight, border:`1px solid ${DS.border}`, borderRadius:12, padding:"20px 24px", marginBottom:14 }}>
        <Lbl color={DS.textLight}>Como os scores são calculados</Lbl>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:12 }}>
          {[
            { faixa:"1–3",  label:"Crítico",           desc:"Sem território próprio, indistinguível dos concorrentes.", color:DS.pink },
            { faixa:"4–6",  label:"Em desenvolvimento", desc:"Diferenciação existe mas não reivindicada com consistência.", color:DS.amber },
            { faixa:"7–8",  label:"Sólido",             desc:"Território claro e comunicado com consistência.", color:DS.green },
            { faixa:"9–10", label:"Referência",         desc:"Inimitável no segmento. Reconhecido pelo mercado.", color:DS.greenDim },
          ].map((r,i) => (
            <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start" }}>
              <div style={{ flexShrink:0, background:r.color+"22", border:`1px solid ${r.color}44`, borderRadius:8, padding:"4px 10px", textAlign:"center", minWidth:52 }}>
                <div style={{ fontSize:13, fontWeight:900, color:r.color, fontFamily:F }}>{r.faixa}</div>
                <div style={{ fontSize:9, fontWeight:700, color:r.color, fontFamily:F }}>{r.label}</div>
              </div>
              <p style={{ fontSize:12, color:DS.textMid, lineHeight:1.55 }}>{r.desc}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize:12, color:DS.textLight, lineHeight:1.6, marginTop:12, paddingTop:12, borderTop:`1px solid ${DS.border}` }}>
          Scores atribuídos com base em evidências públicas e avaliados sob os critérios do framework Smart Branding da LOUDR.
        </p>
      </div>

      {/* Assinatura */}
      <div className="a8" style={{ background:DS.navyMid, borderRadius:12, padding:"16px 22px", marginBottom:14, display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
        <div style={{ width:10, height:10, background:DS.pink, flexShrink:0 }} />
        <div style={{ flex:1 }}>
          <div style={{ fontSize:12, fontWeight:800, color:DS.white, letterSpacing:"0.05em", marginBottom:3 }}>LOUDR Brand Intelligence Agent — tecnologia proprietária</div>
          <p style={{ fontSize:12, color:DS.gray, lineHeight:1.55 }}>Agente de IA desenvolvido internamente pela LOUDR, treinado com o framework Smart Branding e alimentado por dados públicos em tempo real. Cada análise é única — não é um template genérico.</p>
        </div>
      </div>

      {data.porta_entrada_loudr && (
        <div className="a8" style={{ background:DS.navyMid, border:`1px solid ${DS.navyLight}`, borderLeft:`4px solid ${DS.green}`, borderRadius:"0 12px 12px 0", padding:"16px 20px", marginBottom:14 }}>
          <Lbl color={DS.green}>Porta de entrada recomendada — LOUDR</Lbl>
          <p style={{ fontSize:14, color:"#d1e8e0", lineHeight:1.7 }}>{data.porta_entrada_loudr}</p>
        </div>
      )}

      {/* CTA */}
      <div className="a8" style={{ background:DS.navy, borderRadius:12, padding:"24px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:20, flexWrap:"wrap", marginBottom:14 }}>
        <div>
          <Lbl color={DS.green}>Próximo passo</Lbl>
          <div style={{ fontSize:17, fontWeight:900, color:DS.white, marginBottom:6, letterSpacing:"-0.02em" }}>Esse diagnóstico é só o começo.</div>
          <p style={{ fontSize:13, color:DS.gray, lineHeight:1.6, maxWidth:440 }}>Um Brand Discovery Sprint aprofunda cada ponto desse relatório e entrega um roadmap de execução. 2–3 semanas, resultado concreto.</p>
        </div>
        <button onClick={() => window.open("https://loudr.com.br","_blank")}
          style={{ background:DS.green, color:DS.white, border:"none", borderRadius:8, padding:"13px 26px", fontSize:14, fontWeight:800, fontFamily:F, cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
          Falar com a LOUDR →
        </button>
      </div>

      <button onClick={onBack} style={{ background:"none", border:`1px solid ${DS.border}`, borderRadius:8, padding:"8px 20px", fontSize:13, color:DS.textMid, cursor:"pointer", fontFamily:F }}>
        {backLabel}
      </button>
    </div>
  );
}

// ─── Login ────────────────────────────────────────────────────────────────────
function LoginView({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError("");
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setError("E-mail ou senha incorretos."); return; }
    onLogin(data.user);
  }

  return (
    <div style={{ minHeight:"100vh", background:DS.navy, display:"flex", alignItems:"center", justifyContent:"center", fontFamily:F, padding:20 }}>
      <div style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:8 }}>
            <div style={{ width:12, height:12, background:DS.pink }} />
            <span style={{ fontSize:22, fontWeight:900, color:DS.white, letterSpacing:"-0.02em" }}>LOUDR</span>
          </div>
          <div style={{ fontSize:13, color:DS.gray }}>Brand Intelligence · Uso interno</div>
        </div>
        <div style={{ background:DS.navyMid, borderRadius:16, padding:"28px 28px" }}>
          <div style={{ fontSize:16, fontWeight:800, color:DS.white, marginBottom:20 }}>Entrar</div>
          {error && <div style={{ background:DS.pinkPale, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#72243E" }}>{error}</div>}
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:DS.gray, display:"block", marginBottom:6 }}>E-mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="seu@email.com"
                style={{ width:"100%", padding:"11px 14px", fontSize:14, fontFamily:F, background:DS.navy, border:`1px solid ${DS.navyLight}`, borderRadius:8, color:DS.white }} />
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:10, fontWeight:700, letterSpacing:"0.15em", textTransform:"uppercase", color:DS.gray, display:"block", marginBottom:6 }}>Senha</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
                style={{ width:"100%", padding:"11px 14px", fontSize:14, fontFamily:F, background:DS.navy, border:`1px solid ${DS.navyLight}`, borderRadius:8, color:DS.white }} />
            </div>
            <button type="submit" disabled={loading}
              style={{ width:"100%", background:DS.green, color:DS.white, border:"none", borderRadius:8, padding:"13px", fontSize:14, fontWeight:800, fontFamily:F, cursor:loading?"not-allowed":"pointer" }}>
              {loading ? "Entrando..." : "Entrar →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Página Histórico ─────────────────────────────────────────────────────────
function PaginaHistorico({ onAbrirRelatorio }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca]     = useState("");
  const [filter, setFilter]   = useState("todos");

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    setLoading(true);
    const { data } = await supabase
      .from("diagnosticos")
      .select("*")
      .order("created_at", { ascending: false });
    setHistory(data || []);
    setLoading(false);
  }

  const filtered = history.filter(d => {
    const matchBusca = !busca ||
      d.empresa?.toLowerCase().includes(busca.toLowerCase()) ||
      d.setor?.toLowerCase().includes(busca.toLowerCase()) ||
      d.user_name?.toLowerCase().includes(busca.toLowerCase());
    if (!matchBusca) return false;
    if (filter === "todos") return true;
    const avg = ((d.score_singularidade||5)+(d.score_consistencia||5)+(d.score_posicionamento||5))/3;
    if (filter === "alta")  return avg >= 7;
    if (filter === "media") return avg >= 4 && avg < 7;
    if (filter === "baixa") return avg < 4;
    return true;
  });

  const avgSing = history.length ? (history.reduce((a,d) => a+(d.score_singularidade||0), 0)/history.length).toFixed(1) : "—";
  const avgCons = history.length ? (history.reduce((a,d) => a+(d.score_consistencia||0),  0)/history.length).toFixed(1) : "—";

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontSize:24, fontWeight:900, color:DS.navy, letterSpacing:"-0.02em", marginBottom:4 }}>Histórico de diagnósticos</h2>
        <p style={{ fontSize:13, color:DS.textLight }}>Todos os relatórios gerados pela equipe LOUDR.</p>
      </div>

      {/* Stats */}
      {history.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:10, marginBottom:20 }}>
          {[
            { val: history.length,      lbl: "diagnósticos gerados" },
            { val: avgSing,             lbl: "score médio singularidade" },
            { val: avgCons,             lbl: "score médio consistência" },
            { val: history[0]?.empresa, lbl: "último diagnóstico" },
          ].map((s, i) => (
            <div key={i} style={{ background:DS.grayLight, borderRadius:10, padding:"12px 16px" }}>
              <div style={{ fontSize:20, fontWeight:900, color:DS.navy, letterSpacing:"-0.02em" }}>{s.val}</div>
              <div style={{ fontSize:11, color:DS.textLight, marginTop:2 }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      )}

      {/* Busca + Filtros */}
      {history.length > 0 && (
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
          <input
            type="text"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por empresa, setor ou usuário..."
            style={{
              flex:1, minWidth:200, padding:"8px 14px", fontSize:13, fontFamily:F,
              border:`1.5px solid ${DS.border}`, borderRadius:8, background:DS.white, color:DS.text,
              outline:"none",
            }}
          />
          <div style={{ display:"flex", gap:6 }}>
            {[["todos","Todos"],["alta","Score alto"],["media","Score médio"],["baixa","Score baixo"]].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)} style={{
                background: filter===v ? DS.navy : "none",
                color: filter===v ? DS.white : DS.textMid,
                border: `1px solid ${filter===v ? DS.navy : DS.border}`,
                borderRadius:99, padding:"5px 14px", fontSize:12, cursor:"pointer", fontFamily:F,
              }}>{l}</button>
            ))}
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign:"center", padding:"3rem", color:DS.textLight, fontSize:13 }}>Carregando...</div>
      ) : history.length === 0 ? (
        <div style={{ textAlign:"center", padding:"4rem 1rem", color:DS.textLight }}>
          <div style={{ fontSize:14, marginBottom:8 }}>Nenhum diagnóstico salvo ainda.</div>
          <div style={{ fontSize:12 }}>Gere um diagnóstico para ele aparecer aqui.</div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:"2rem", color:DS.textLight, fontSize:13 }}>Nenhum diagnóstico encontrado.</div>
      ) : (
        filtered.map(d => (
          <div
            key={d.id}
            onClick={() => onAbrirRelatorio(d)}
            style={{
              background:DS.white, border:`1px solid ${DS.border}`,
              borderRadius:12, padding:"18px 22px", marginBottom:10,
              cursor:"pointer", transition:"all 0.15s",
              display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16,
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = DS.green; e.currentTarget.style.boxShadow = `0 2px 12px rgba(13,158,122,0.08)`; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = DS.border; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ flex:1 }}>
              {/* Empresa + meta */}
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4, flexWrap:"wrap" }}>
                <span style={{ fontSize:16, fontWeight:800, color:DS.navy }}>{d.empresa}</span>
                <span style={{ fontSize:12, color:DS.textLight }}>{d.setor} · {d.porte}</span>
              </div>
              <div style={{ fontSize:11, color:DS.textLight, marginBottom:10 }}>
                {fmtDate(d.created_at)} · por {d.user_name || d.user_email}
              </div>

              {/* Scores */}
              <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:10 }}>
                {[
                  { l:"Singularidade",  v:d.score_singularidade },
                  { l:"Consistência",   v:d.score_consistencia },
                  { l:"Posicionamento", v:d.score_posicionamento },
                ].map(s => (
                  <span key={s.l} style={{ fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:99, background:scBg(s.v), color:scTxt(s.v), fontFamily:F }}>
                    {s.l} {s.v}
                  </span>
                ))}
              </div>

              {/* Frase */}
              {d.frase_diagnostico && (
                <div style={{ borderLeft:`2px solid ${DS.green}`, paddingLeft:10, fontSize:13, color:DS.textMid, fontStyle:"italic", lineHeight:1.55 }}>
                  "{d.frase_diagnostico}"
                </div>
              )}
            </div>

            {/* CTA */}
            <div style={{ flexShrink:0, display:"flex", flexDirection:"column", alignItems:"flex-end", gap:8 }}>
              <span style={{ fontSize:12, color:DS.green, fontWeight:700 }}>Ver relatório →</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  // pages: "home" | "loading" | "report" | "historico" | "relatorio"
  const [page, setPage]               = useState("home");
  const [empresa, setEmpresa]         = useState("");
  const [contexto, setContexto]       = useState("");
  const [stepIdx, setStepIdx]         = useState(0);
  const [progress, setProgress]       = useState("");
  const [reportData, setReportData]   = useState(null);   // diagnóstico recém gerado
  const [historicoItem, setHistoricoItem] = useState(null); // item do histórico selecionado
  const [error, setError]             = useState("");
  const [histCount, setHistCount]     = useState(0);

  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap";
    document.head.appendChild(l);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => { subscription.unsubscribe(); document.head.removeChild(l); };
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("diagnosticos").select("id", { count:"exact", head:true })
      .then(({ count }) => setHistCount(count || 0));
  }, [user]);

  function navigate(p) {
    setPage(p);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("home"); setReportData(null); setEmpresa(""); setContexto("");
  }

  function abrirRelatorioHistorico(item) {
    setHistoricoItem(item);
    navigate("relatorio");
  }

  async function run() {
    if (!empresa.trim()) return;
    navigate("loading"); setReportData(null); setError(""); setStepIdx(0);

    for (let i = 0; i < STEPS.length; i++) {
      setProgress(STEPS[i]); setStepIdx(i);
      await new Promise(r => setTimeout(r, i === STEPS.length-1 ? 800 : 1500));
    }

    try {
      const res = await fetch("/api/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 6000,
          system: SYSTEM_PROMPT,
          tools: [{ type:"web_search_20250305", name:"web_search" }],
          messages: [{ role:"user", content:`Diagnóstico Smart Branding para: "${empresa}".${contexto ? `\nContexto: ${contexto}` : ""}\nPesquise todas as fontes e gere o JSON completo.` }],
        }),
      });

      const raw = await res.json();
      if (raw.error) throw new Error(raw.error.message);
      const block = raw.content?.find(b => b.type === "text");
      if (!block) throw new Error("Sem resposta da API.");

      let txt = block.text.trim().replace(/^```[a-z]*\n?/i,"").replace(/\n?```$/i,"").trim();
      const j0 = txt.indexOf("{"), j1 = txt.lastIndexOf("}");
      if (j0 < 0 || j1 < 0) throw new Error("JSON não encontrado.");
      const parsed = JSON.parse(txt.slice(j0, j1+1));

      // Salvar no Supabase
      const { error: dbErr } = await supabase.from("diagnosticos").insert({
        user_id:              user.id,
        user_email:           user.email,
        user_name:            user.user_metadata?.full_name || user.email.split("@")[0],
        empresa:              parsed.empresa,
        dominio:              parsed.dominio,
        setor:                parsed.setor,
        porte:                parsed.porte,
        score_singularidade:  parsed.score_singularidade,
        score_consistencia:   parsed.score_consistencia,
        score_posicionamento: parsed.score_posicionamento,
        frase_diagnostico:    parsed.frase_diagnostico,
        data:                 parsed,
      });

      if (dbErr) console.error("Erro ao salvar:", dbErr);
      else setHistCount(c => c + 1);

      setReportData(parsed);
      navigate("report");
    } catch (e) {
      setError(e.message || "Erro desconhecido.");
      navigate("home");
    }
  }

  // ── Telas de auth ──
  if (authLoading) return (
    <div style={{ minHeight:"100vh", background:DS.navy, display:"flex", alignItems:"center", justifyContent:"center" }}>
      <div style={{ width:40, height:40, border:`3px solid ${DS.navyMid}`, borderTopColor:DS.green, borderRadius:"50%", animation:"spin 0.75s linear infinite" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );

  if (!user) return <LoginView onLogin={setUser} />;

  return (
    <div style={{ fontFamily:F, color:DS.text, background:DS.offwhite, minHeight:"100vh" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fu { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .a0{animation:fu .38s ease both} .a1{animation:fu .38s .06s ease both} .a2{animation:fu .38s .12s ease both}
        .a3{animation:fu .38s .18s ease both} .a4{animation:fu .38s .24s ease both} .a5{animation:fu .38s .30s ease both}
        .a6{animation:fu .38s .36s ease both} .a7{animation:fu .38s .42s ease both} .a8{animation:fu .38s .48s ease both}
        input:focus, textarea:focus { outline:none!important; border-color:${DS.green}!important; box-shadow:0 0 0 3px ${DS.greenPale}!important; }
      `}</style>

      <Nav user={user} page={page} onNavigate={navigate} onLogout={handleLogout} histCount={histCount} />

      <div style={{ maxWidth:860, margin:"0 auto", padding:"28px 20px 72px" }}>

        {/* Erro */}
        {error && (
          <div style={{ background:DS.pinkPale, border:`1px solid #F4C0D1`, borderRadius:10, padding:"14px 18px", marginBottom:14 }}>
            <div style={{ fontWeight:800, color:DS.pink, marginBottom:4, fontSize:14 }}>Erro ao gerar diagnóstico</div>
            <div style={{ fontSize:13, color:"#72243E" }}>{error}</div>
            <button onClick={() => setError("")} style={{ marginTop:10, fontSize:12, cursor:"pointer", background:"none", border:`1px solid ${DS.border}`, borderRadius:6, padding:"4px 12px", color:DS.textMid, fontFamily:F }}>Fechar</button>
          </div>
        )}

        {/* HOME — formulário */}
        {page === "home" && (
          <div>
            <div className="a0" style={{ background:DS.navy, borderRadius:16, padding:"40px 36px 34px", marginBottom:14, position:"relative", overflow:"hidden" }}>
              <div style={{ position:"absolute", right:-24, top:-24, width:200, height:200, borderRadius:"50%", background:DS.green, opacity:0.05 }} />
              <div style={{ position:"absolute", right:64, bottom:-36, width:120, height:120, borderRadius:"50%", background:DS.pink, opacity:0.08 }} />
              <div style={{ width:16, height:16, background:DS.pink, marginBottom:18 }} />
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.2em", color:DS.green, marginBottom:10, textTransform:"uppercase" }}>LOUDR · BRAND INTELLIGENCE</div>
              <h1 style={{ fontSize:32, fontWeight:900, color:DS.white, letterSpacing:"-0.03em", lineHeight:1.2, marginBottom:14 }}>
                Diagnóstico de<br /><span style={{ color:DS.green }}>Singularidade de Marca</span>
              </h1>
              <p style={{ fontSize:14, color:DS.gray, lineHeight:1.7, maxWidth:540, marginBottom:24 }}>
                Análise baseada no framework Smart Branding da LOUDR — 4 práticas, múltiplas fontes de dados públicos, perguntas cirúrgicas.
              </p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                {PRATICAS.map(p => (
                  <div key={p.key} style={{ background:DS.navyMid, borderRadius:8, padding:"10px 14px", borderLeft:`3px solid ${p.color}` }}>
                    <div style={{ fontSize:11, fontWeight:700, color:p.color, marginBottom:2 }}>{p.label}</div>
                    <div style={{ fontSize:11, color:DS.gray }}>{p.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <Card className="a1">
              <div style={{ marginBottom:16 }}>
                <label style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:DS.textLight, display:"block", marginBottom:7 }}>Empresa ou domínio</label>
                <input type="text" value={empresa} onChange={e => setEmpresa(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && empresa.trim() && run()}
                  placeholder="ex: Nubank, farm.com.br, Magazine Luiza..."
                  style={{ width:"100%", padding:"11px 14px", fontSize:15, fontWeight:500, fontFamily:F, border:`1.5px solid ${DS.border}`, borderRadius:8, background:DS.offwhite, color:DS.text }} />
              </div>
              <div style={{ marginBottom:24 }}>
                <label style={{ fontSize:10, fontWeight:700, letterSpacing:"0.18em", textTransform:"uppercase", color:DS.textLight, display:"block", marginBottom:7 }}>
                  Contexto adicional <span style={{ fontWeight:400, textTransform:"none" }}>(opcional)</span>
                </label>
                <textarea value={contexto} onChange={e => setContexto(e.target.value)}
                  placeholder="ex: fintech B2B, lançou novo produto em 2024..." rows={3}
                  style={{ width:"100%", padding:"11px 14px", fontSize:14, fontFamily:F, border:`1.5px solid ${DS.border}`, borderRadius:8, background:DS.offwhite, resize:"vertical", color:DS.text, lineHeight:1.55 }} />
              </div>
              <button onClick={run} disabled={!empresa.trim()}
                style={{ background:empresa.trim()?DS.navy:"#9ca3af", color:DS.white, border:"none", padding:"13px 28px", borderRadius:8, fontSize:14, fontWeight:800, fontFamily:F, cursor:empresa.trim()?"pointer":"not-allowed" }}>
                Gerar diagnóstico →
              </button>
            </Card>
          </div>
        )}

        {/* LOADING */}
        {page === "loading" && (
          <Card style={{ padding:"52px 32px", textAlign:"center" }}>
            <div style={{ width:52, height:52, border:`3px solid ${DS.border}`, borderTopColor:DS.green, borderRadius:"50%", margin:"0 auto 22px", animation:"spin 0.75s linear infinite" }} />
            <div style={{ fontSize:20, fontWeight:900, marginBottom:6, letterSpacing:"-0.02em" }}>Analisando marca</div>
            <div style={{ fontSize:14, color:DS.textMid, marginBottom:28 }}>{progress}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:9, alignItems:"center" }}>
              {STEPS.map((s,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:stepIdx===i?700:400, color:stepIdx>i?DS.green:stepIdx===i?DS.navy:DS.border, transition:"color 0.3s" }}>
                  <span style={{ minWidth:14, textAlign:"center", fontSize:12 }}>{stepIdx>i?"✓":stepIdx===i?"▶":"○"}</span>
                  {s}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* REPORT — relatório recém gerado */}
        {page === "report" && reportData && (
          <RelatorioCompleto
            data={reportData}
            onBack={() => { setReportData(null); setEmpresa(""); setContexto(""); navigate("home"); }}
            backLabel="← Novo diagnóstico"
          />
        )}

        {/* HISTÓRICO — lista */}
        {page === "historico" && (
          <PaginaHistorico onAbrirRelatorio={abrirRelatorioHistorico} />
        )}

        {/* RELATORIO — relatório do histórico */}
        {page === "relatorio" && historicoItem && (
          <RelatorioCompleto
            data={historicoItem.data}
            meta={historicoItem}
            onBack={() => navigate("historico")}
            backLabel="← Voltar ao histórico"
          />
        )}

      </div>
    </div>
  );
}