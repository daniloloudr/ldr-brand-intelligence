import { PRATICAS } from "../lib/constants";
import { Bar } from "../components/Bar";
import { PublicHeader } from "../components/PublicHeader";
import { PublicFooter } from "../components/PublicFooter";
import { PALETTE, theme as themeDark } from '../lib/theme'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Chip from "@mui/material/Chip";
import { Box, Typography } from "@mui/material";
import Button from "@mui/material/Button";
import { Card, CardContent } from "@mui/material";

const SCORES = [
  {
    key: "singularidade",
    label: "Score de Singularidade",
    desc: "Mede o grau de diferenciação e unicidade da marca no mercado.",
    detail: "O agent analisa o posicionamento declarado, a narrativa do site, a comunicação em redes sociais e compara com o território dos concorrentes diretos. Avalia se a marca reivindica um espaço único e inimitável — ou se é mais do mesmo.",
    color: PALETTE.data.positivo,
    sources: ["Site institucional", "LinkedIn", "Instagram", "Análise de concorrentes", "SERPs"],
  },
  {
    key: "consistencia",
    label: "Score de Consistência",
    desc: "Avalia a coerência entre identidade declarada e percebida.",
    detail: "Cruza o que a marca diz ser (site, comunicação) com o que o mercado percebe (Google Reviews, Reclame Aqui, Glassdoor, comentários em redes). Contradições entre intenção e percepção reduzem este score.",
    color: PALETTE.data.critico,
    sources: ["Google Reviews", "Reclame Aqui", "Glassdoor", "Comentários em redes", "Anúncios ativos"],
  },
  {
    key: "posicionamento",
    label: "Score de Posicionamento",
    desc: "Mede a clareza estratégica e a força do território de marca.",
    detail: "Avalia a nitidez da proposta de valor, a coerência entre os canais de comunicação e se a marca sabe — e comunica — exatamente para quem e por quê existe. Um posicionamento vago ou genérico recebe score baixo.",
    color: PALETTE.data.atencao,
    sources: ["Site e narrativa principal", "Anúncios pagos", "SEO e SERPs", "Tone of voice", "Vagas abertas"],
  },
];

const TIERS = [
  { range:"1–3",  label:"Crítico",            color:PALETTE.data.critico,   bg:PALETTE.data.criticoFraco,   desc:"A marca não tem território claro, é inconsistente ou praticamente invisível. Intervenção estratégica urgente." },
  { range:"4–6",  label:"Em desenvolvimento", color:PALETTE.data.atencao,  bg:PALETTE.data.atencaoFraco,  desc:"Existe uma direção, mas ainda fragmentada. A marca tem potencial mas não explora sua singularidade com consistência." },
  { range:"7–8",  label:"Sólido",             color:PALETTE.data.positivo,  bg:PALETTE.data.positivoFraco,  desc:"Marca com posicionamento claro, coerência e diferenciação percebida. Poucas brechas estratégicas importantes." },
  { range:"9–10", label:"Referência",         color:PALETTE.data.neutro, bg:PALETTE.neutral[0],     desc:"Marca de referência no seu território. Singularidade reconhecida, consistência alta e posicionamento incontestável." },
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
    <ThemeProvider theme={themeDark}>
      <CssBaseline />
    <Box sx={{ minHeight:"100vh", bgcolor: "background.default" }}>

      <PublicHeader sticky>
        <Button variant="outlined" size="small"
          onClick={() => window.history.back()}
        >
          ← Voltar
        </Button>
      </PublicHeader>

      <Box sx={{ maxWidth:800, margin:"0 auto", padding:"48px 20px 80px" }}>

        {/* Hero */}
        <Box sx={{ marginBottom: '40px' }}>
          <Box sx={{ fontWeight:700, letterSpacing:"0.2em", color:PALETTE.data.positivo, textTransform:"uppercase", marginBottom: '10px' }}>Como calculamos</Box>
          <Typography variant="h4" sx={{ color:'text.primary', letterSpacing:"-0.03em", lineHeight:1.15, marginBottom: '16px' }}>
            Metodologia Smart Branding
          </Typography>
          <Typography sx={{ color:'text.secondary', lineHeight:1.8, maxWidth:600 }}>
            Os scores são gerados por um agent de IA que pesquisa ativamente dados públicos da marca e aplica o framework proprietário da LOUDR — Smart Branding. Nenhum dado é inventado: tudo vem de fontes reais e verificáveis.
          </Typography>
        </Box>

        {/* Framework */}
        <Box sx={{ marginBottom: '36px' }}>
          <Typography variant="overline" component="div" sx={{ color: 'text.disabled', mb: 1.25 }}>O framework</Typography>
          <Card variant="outlined" sx={{ marginBottom: '14px', bgcolor:'background.paper' }}><CardContent>
            <Box sx={{ fontWeight:700, letterSpacing:"0.2em", color:PALETTE.data.positivo, textTransform:"uppercase", marginBottom: '12px' }}>Smart Branding</Box>
            <Typography sx={{ color:PALETTE.neutral[200], lineHeight:1.75, marginBottom: '20px' }}>
              Smart Branding é o encontro de três forças — <Typography component="span" sx={{ color:PALETTE.neutral[0], fontWeight:700 }}>Estratégia</Typography>, <Typography component="span" sx={{ color:PALETTE.neutral[0], fontWeight:700 }}>Design</Typography> e <Typography component="span" sx={{ color:PALETTE.neutral[0], fontWeight:700 }}>Tecnologia</Typography> — que define que identidade de marca não é só comunicação: está em tudo que a empresa faz.
            </Typography>
            <Box sx={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap: '8px' }}>
              {PRATICAS.map(p => (
                <Box key={p.key} sx={{ bgcolor:'action.hover',  padding:"12px 14px", borderLeft:`3px solid ${p.color}` }}>
                  <Box sx={{ fontWeight:700, color:p.color, marginBottom: '3px' }}>{p.label}</Box>
                  <Box sx={{ color:PALETTE.neutral[400] }}>{p.sub}</Box>
                </Box>
              ))}
            </Box>
          </CardContent></Card>
        </Box>

        {/* Os 3 scores */}
        <Box sx={{ marginBottom: '36px' }}>
          <Typography variant="overline" component="div" sx={{ color: 'text.disabled', mb: 1.25 }}>Os 3 scores principais</Typography>
          <Typography sx={{ color:'text.disabled', marginBottom: '16px' }}>
            Cada diagnóstico gera três scores de 1 a 10. O score médio geral é a média aritmética dos três.
          </Typography>
          {SCORES.map((s, i) => (
            <Card key={s.key} sx={{ marginBottom: '10px', borderLeft:`3px solid ${s.color}`, borderRadius:"0 12px 12px 0" }}><CardContent>
              <Box sx={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap: '16px', flexWrap:"wrap" }}>
                <Box sx={{ flex:1 }}>
                  <Box sx={{ fontWeight:800, color:'text.primary', marginBottom: '4px' }}>{s.label}</Box>
                  <Typography sx={{ color:'text.secondary', lineHeight:1.7, marginBottom: '12px' }}>{s.desc}</Typography>
                  <Typography sx={{ color:'text.disabled', lineHeight:1.7, marginBottom: '12px' }}>{s.detail}</Typography>
                  <Box sx={{ display:"flex", flexWrap:"wrap", gap: '6px' }}>
                    {s.sources.map(src => (
                      <Chip key={src} label={src} size="small" sx={{ bgcolor: s.color + "18", color: s.color }} />
                    ))}
                  </Box>
                </Box>
              </Box>
            </CardContent></Card>
          ))}
        </Box>

        {/* Escala de maturidade */}
        <Box sx={{ marginBottom: '36px' }}>
          <Typography variant="overline" component="div" sx={{ color: 'text.disabled', mb: 1.25 }}>Escala de maturidade</Typography>
          <Box sx={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap: '10px' }}>
            {TIERS.map(t => (
              <Box key={t.range} sx={{ background:t.bg,  padding:"16px 18px", border:`1px solid ${t.color}33` }}>
                <Box sx={{ display:"flex", alignItems:"center", gap: '8px', marginBottom: '8px' }}>
                  <Box sx={{ width:8, height:8,  background:t.color }} />
                  <Typography component="span" sx={{ color:t.color }}>{t.range}</Typography>
                </Box>
                <Box sx={{ fontWeight:800, color:'text.primary', marginBottom: '6px' }}>{t.label}</Box>
                <Typography sx={{ color:'text.secondary', lineHeight:1.6 }}>{t.desc}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Fontes de pesquisa */}
        <Box sx={{ marginBottom: '36px' }}>
          <Typography variant="overline" component="div" sx={{ color: 'text.disabled', mb: 1.25 }}>Fontes de pesquisa</Typography>
          <Typography sx={{ color:'text.disabled', marginBottom: '16px' }}>
            O agent pesquisa ativamente 8 fontes públicas antes de calcular os scores.
          </Typography>
          <Box sx={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap: '8px' }}>
            {FONTES.map(f => (
              <Box key={f.label} sx={{ background:PALETTE.neutral[0], border:`1px solid ${PALETTE.neutral[100]}`,  padding:"12px 14px", display:"flex", gap: '10px', alignItems:"flex-start" }}>
                <Typography component="span" sx={{ fontSize:18 }}>{f.icon}</Typography>
                <Box>
                  <Box sx={{ fontWeight:700, color:'text.primary', marginBottom: '2px' }}>{f.label}</Box>
                  <Box sx={{ color:'text.disabled', lineHeight:1.5 }}>{f.desc}</Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Limitações */}
        <Card sx={{ background:PALETTE.data.atencaoFraco, border:`1px solid ${PALETTE.data.atencao}44` }}><CardContent>
          <Typography variant="overline" component="div" sx={{ color: 'PALETTE.neutral[800]', mb: 1.25 }}>Limitações importantes</Typography>
          <Box component="ul" sx={{ m:0, pl: 2.5 }}>
            {[
              "Os scores refletem dados públicos disponíveis no momento da análise — não substituem uma auditoria estratégica aprofundada.",
              "Empresas com baixa presença digital podem ter scores subestimados por falta de dados rastreáveis.",
              "O diagnóstico é um retrato de momento, não uma avaliação permanente da marca.",
              "Scores altos indicam boa saúde de marca percebida — não garantem desempenho financeiro.",
            ].map((l, i) => (
              <Box component="li" key={i} sx={{ color: "warning.main", lineHeight:1.75, marginBottom: '4px'}}>{l}</Box>
            ))}
          </Box>
        </CardContent></Card>

      </Box>
      <PublicFooter />
    </Box>
    </ThemeProvider>
  );
}
