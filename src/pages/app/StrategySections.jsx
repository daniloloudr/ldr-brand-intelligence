// StrategySections — as seções novas da árvore Strategy (Onda 2).
// Reagrupam campos EXISTENTES do verbal_identity (canônicos, sem de-para no
// banco) e editam os campos NOVOS da coluna strategy (migration 035).
// Essência (Culture) · Negócio (Função) · Experiência · Personalidade.
import { useState, useEffect } from 'react'
import { Box, Typography, TextField, IconButton, Paper, Stack, Chip } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined'
import { supabase } from '../../lib/supabase'
import { buildDesignMd } from '../../lib/designMd'
import { FieldLabel, SectionDivider, ChipInput } from './BrandSection'
import { PALETTE } from '../../lib/theme'

const tf = { '& .MuiInputBase-input': { fontSize: 14 } }

// O onChange já sabe qual campo edita; só não contava. Etiquetando a função na
// fábrica, todo campo ganha âncora (`data-campo`) sem tocar em nenhuma das
// dezenas de chamadas — é por essa âncora que uma pendência do sininho aterrissa
// no campo exato em vez de no topo da página.
const marcar = (coluna, k, fn) => Object.assign(fn, { campo: `${coluna}.${k}` })

function Grid2({ children }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>{children}</Box>
}

function Area({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <Box data-campo={onChange?.campo}>
      <FieldLabel>{label}</FieldLabel>
      <TextField value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        fullWidth multiline rows={rows} sx={tf} />
    </Box>
  )
}

// Lista de itens estruturados (mesmo padrão do ItemList da Verbal)
function ItemList({ label, items, onChange, fields, addLabel = 'Adicionar', emptyMsg }) {
  const add = () => onChange([...(items || []), Object.fromEntries(fields.map(f => [f.key, '']))])
  const update = (idx, key, val) => onChange((items || []).map((it, i) => i === idx ? { ...it, [key]: val } : it))
  const remove = idx => onChange((items || []).filter((_, i) => i !== idx))
  return (
    <Box data-campo={onChange?.campo}>
      <FieldLabel>{label}</FieldLabel>
      <Stack spacing={1.5}>
        {(items || []).length === 0 && emptyMsg && <Typography variant="caption" color="text.disabled">{emptyMsg}</Typography>}
        {(items || []).map((it, idx) => (
          <Paper key={idx} variant="outlined" sx={{ p: 2, position: 'relative', borderRadius: 2 }}>
            <Stack spacing={1.25}>
              {fields.map(f => (
                <TextField key={f.key} label={f.label} value={it[f.key] || ''} placeholder={f.placeholder}
                  onChange={e => update(idx, f.key, e.target.value)} fullWidth
                  multiline={f.multiline} rows={f.rows || (f.multiline ? 2 : undefined)}
                  InputProps={{ sx: { fontSize: 14 } }} InputLabelProps={{ sx: { fontSize: 14 } }} />
              ))}
            </Stack>
            <IconButton size="small" onClick={() => remove(idx)}
              sx={{ position: 'absolute', top: 8, right: 8, color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Paper>
        ))}
        <Chip icon={<AddIcon />} label={addLabel} onClick={add} variant="outlined"
          sx={{ alignSelf: 'flex-start', fontWeight: 700 }} />
      </Stack>
    </Box>
  )
}

// ── Culture → Brand Essence ──────────────────────────────────────────
export function EssenciaSection({ verbal = {}, strategy = {}, onVerbal, onStrategy }) {
  const v = k => marcar('verbal_identity', k, val => onVerbal({ ...verbal, [k]: val }))
  const s = k => marcar('strategy', k, val => onStrategy({ ...strategy, [k]: val }))
  return (
    <Stack spacing={4}>
      <SectionDivider>Brand Essence</SectionDivider>
      <Grid2>
        <Area label="Vision (Visão)" value={verbal.visao} onChange={v('visao')} placeholder="Onde a marca quer chegar — o futuro que ela persegue" />
        <Area label="Purpose (Propósito)" value={verbal.proposito} onChange={v('proposito')} placeholder="Por que a marca existe além do lucro" />
      </Grid2>
      <Area label="Missão" value={verbal.missao} onChange={v('missao')} placeholder="O que a marca faz todos os dias para realizar a visão" />
      <ChipInput label="Values (Valores)" values={verbal.valores} onChange={v('valores')} placeholder="Digite um valor e Enter" />
      <SectionDivider>Positioning & Meaning</SectionDivider>
      <Grid2>
        <Area label="Brand Positioning" value={verbal.posicionamento} onChange={v('posicionamento')} rows={4}
          placeholder="O lugar que a marca ocupa na mente do público — alimenta toda geração" />
        <Area label="Brand Meaning" value={strategy.meaning} onChange={s('meaning')} rows={4}
          placeholder="O significado da marca na vida das pessoas — o que ela representa além do que vende" />
      </Grid2>
    </Stack>
  )
}

// ── Business → Função ────────────────────────────────────────────────
export function NegocioSection({ verbal = {}, strategy = {}, onVerbal, onStrategy }) {
  const v = k => marcar('verbal_identity', k, val => onVerbal({ ...verbal, [k]: val }))
  const s = k => marcar('strategy', k, val => onStrategy({ ...strategy, [k]: val }))
  return (
    <Stack spacing={4}>
      <SectionDivider>Função do negócio</SectionDivider>
      <Grid2>
        <Area label="Value Proposition" value={verbal.proposta_valor} onChange={v('proposta_valor')}
          placeholder="A promessa de valor central — por que escolher esta marca" />
        <Area label="Business Model" value={strategy.business_model} onChange={s('business_model')}
          placeholder="Como a marca gera valor e receita" />
      </Grid2>
      <Grid2>
        <Area label="Portfolio" value={strategy.portfolio} onChange={s('portfolio')}
          placeholder="Produtos/serviços e como se organizam" />
        <Area label="Brand Architecture" value={strategy.brand_architecture} onChange={s('brand_architecture')}
          placeholder="Relação entre marca-mãe, sub-marcas e produtos" />
      </Grid2>
      <ChipInput label="Stakeholders" values={strategy.stakeholders} onChange={s('stakeholders')} placeholder="Ex.: clientes, investidores, parceiros… (Enter)" />
      <SectionDivider>Personas</SectionDivider>
      <ItemList label="Personas" items={strategy.personas} onChange={s('personas')} addLabel="Adicionar persona"
        emptyMsg="Quem a marca serve — cada persona afia a copy e as peças geradas."
        fields={[
          { key: 'nome', label: 'Nome / papel', placeholder: 'Ex.: Marina, head de marketing de PME' },
          { key: 'descricao', label: 'Descrição', multiline: true, placeholder: 'Contexto, comportamento, canal onde vive' },
          { key: 'dores', label: 'Dores', multiline: true, placeholder: 'O que tira o sono dela' },
          { key: 'objetivos', label: 'Objetivos', multiline: true, placeholder: 'O que ela quer alcançar' },
        ]} />
      <SectionDivider>Goals & KPIs</SectionDivider>
      <ItemList label="Objetivos e indicadores" items={strategy.goals_kpis} onChange={s('goals_kpis')} addLabel="Adicionar objetivo"
        emptyMsg="Metas da marca e como medi-las."
        fields={[
          { key: 'objetivo', label: 'Objetivo', placeholder: 'Ex.: ser referência em Smart Branding no BR' },
          { key: 'kpi', label: 'KPI', placeholder: 'Ex.: share of search do termo' },
          { key: 'meta', label: 'Meta', placeholder: 'Ex.: top-3 em 12 meses' },
        ]} />
    </Stack>
  )
}

// ── Business → Experience (UX · UI · Journey · Design.md gerado) ─────
export function ExperienciaSection({ strategy = {}, onStrategy, brandNome, visual, tokens, assets }) {
  const s = k => marcar('strategy', k, val => onStrategy({ ...strategy, [k]: val }))
  const [copied, setCopied] = useState(false)
  const md = buildDesignMd({ brandNome, visual, strategy, tokens, assets })

  async function copiar() {
    await navigator.clipboard.writeText(md).catch(() => {})
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  function baixar() {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([md], { type: 'text/markdown' }))
    a.download = 'design.md'
    a.click(); URL.revokeObjectURL(a.href)
  }

  return (
    <Stack spacing={4}>
      <SectionDivider>Experience</SectionDivider>
      <Grid2>
        <Area label="UX — princípios de experiência" value={strategy.ux} onChange={s('ux')}
          placeholder="Como deve ser a experiência de usar/consumir a marca" />
        <Area label="UI — princípios de interface" value={strategy.ui} onChange={s('ui')}
          placeholder="Diretrizes de interface e interação" />
      </Grid2>
      <Area label="Customer Journey" value={strategy.customer_journey} onChange={s('customer_journey')} rows={5}
        placeholder="A jornada do cliente — do primeiro contato ao pós-venda, com os momentos-chave da marca" />

      <SectionDivider>Design System — design.md</SectionDivider>
      <Typography variant="body2" color="text.secondary" sx={{ mt: -2 }}>
        Gerado automaticamente do que a marca já tem (paleta, tipografia, tokens, logos, princípios) — nada para preencher duas vezes.
        É o artefato que times de produto e agentes de IA consomem.
      </Typography>
      <Grid2>
        <Box>
          <FieldLabel>Storybook (opcional)</FieldLabel>
          <TextField value={strategy.storybook_url || ''} onChange={e => s('storybook_url')(e.target.value)}
            placeholder="https://storybook.suamarca.com — importação automática em breve" fullWidth sx={tf} />
        </Box>
        <Area label="Notas de design (entram no design.md)" value={strategy.design_notes} onChange={s('design_notes')} rows={2}
          placeholder="Regras extras que o time quer registrar" />
      </Grid2>
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" sx={{ flex: 1 }}>design.md</Typography>
          <Chip label={copied ? 'Copiado!' : 'Copiar'} size="small" onClick={copiar} sx={{ fontWeight: 700, mr: 1 }} />
          <Chip label="Baixar .md" size="small" onClick={baixar} variant="outlined" sx={{ fontWeight: 700 }} />
        </Stack>
        <Box component="pre" sx={{ m: 0, p: 2, fontSize: 12, lineHeight: 1.6, fontFamily: 'ui-monospace, Menlo, monospace',
          whiteSpace: 'pre-wrap', maxHeight: 420, overflowY: 'auto', bgcolor: 'background.default' }}>
          {md}
        </Box>
      </Paper>
    </Stack>
  )
}

// ── Communication → Personality ──────────────────────────────────────
export function PersonalidadeSection({ verbal = {}, strategy = {}, onVerbal, onStrategy, brandId }) {
  const v = k => marcar('verbal_identity', k, val => onVerbal({ ...verbal, [k]: val }))
  const s = k => marcar('strategy', k, val => onStrategy({ ...strategy, [k]: val }))
  const [territorioIA, setTerritorioIA] = useState(null)

  // Território APRENDIDO (faceta do cérebro) — vitrine do declarado + destilado
  useEffect(() => {
    if (!brandId) return
    let on = true
    supabase.from('brand_intelligence').select('versao, modelo').eq('brand_id', brandId)
      .order('versao', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => { if (on && data?.modelo?.territorio?.valor) setTerritorioIA({ v: data.versao, valor: data.modelo.territorio.valor }) })
    return () => { on = false }
  }, [brandId])

  return (
    <Stack spacing={4}>
      <SectionDivider>Personality</SectionDivider>
      <Grid2>
        <ChipInput label="Attributes (Personalidade)" values={verbal.personalidade} onChange={v('personalidade')} placeholder="Ex.: provocadora, direta… (Enter)" />
        <ChipInput label="Atributos de tom" values={verbal.tom_atributos} onChange={v('tom_atributos')} placeholder="Como a personalidade soa (Enter)" />
      </Grid2>
      <SectionDivider>Territories</SectionDivider>
      {territorioIA && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(127,119,221,0.06)', borderColor: 'rgba(127,119,221,0.35)' }}>
          <Stack direction="row" spacing={1.25} alignItems="flex-start">
            <PsychologyOutlinedIcon sx={{ color: PALETTE.data.neutro, fontSize: 20, mt: 0.25 }} />
            <Box>
              <Typography variant="overline" sx={{ color: PALETTE.data.neutro, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Território aprendido pela IA (v{territorioIA.v})
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{territorioIA.valor}</Typography>
            </Box>
          </Stack>
        </Paper>
      )}
      <Area label="Territórios — notas do time" value={strategy.territorio_notas} onChange={s('territorio_notas')}
        placeholder="Direcionamento humano sobre os territórios: o que reivindicar, o que evitar" />
      <SectionDivider>Storytelling</SectionDivider>
      <Area label="Overview" value={strategy.storytelling_overview} onChange={s('storytelling_overview')} rows={4}
        placeholder="A grande narrativa da marca — o arco que conecta tudo que ela comunica" />
      <ItemList label="Seasons (temporadas narrativas)" items={strategy.seasons} onChange={s('seasons')} addLabel="Adicionar season"
        emptyMsg="Capítulos da narrativa ao longo do ano — campanhas e momentos com tema próprio."
        fields={[
          { key: 'nome', label: 'Nome', placeholder: 'Ex.: Lançamento Writing Room' },
          { key: 'periodo', label: 'Período', placeholder: 'Ex.: ago–set/2026' },
          { key: 'narrativa', label: 'Narrativa', multiline: true, placeholder: 'O tema e a mensagem desta temporada' },
        ]} />
    </Stack>
  )
}
