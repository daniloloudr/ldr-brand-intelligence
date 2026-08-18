// StrategySections.jsx — as telas da Estratégia, desenhadas a partir do mapa.
//
// Antes cada tela era escrita à mão e dez campos apareciam em duas delas ao
// mesmo tempo. Agora a estrutura vive em campos.js e a tela é uma função dela:
// duplicar virou impossível por construção. Ver o comentário de campos.js para
// o histórico do problema.
//
// O que sobra aqui é o que NÃO é campo de formulário: o design.md gerado, o
// território que a IA aprendeu, e a mesclagem das personas legadas.
import { useState, useEffect } from 'react'
import { Box, Typography, Paper, Stack, Chip, Alert, Button } from '@mui/material'
import PsychologyOutlinedIcon from '@mui/icons-material/PsychologyOutlined'
import { CamposDaMarca } from './CamposDaMarca'
import { ESSENCIA, FUNCAO, EXPERIENCIA, PERSONALIDADE } from '../../lib/campos'
import { buildDesignMd } from '../../lib/designMd'
import { supabase } from '../../lib/supabase'
import { PALETTE } from '../../lib/theme'

// Cada seção recebe as duas colunas e devolve o patch da que mudou. Manter uma
// só assinatura evita o vaivém de props que existia antes.
const useEditor = (verbal, strategy, onVerbal, onStrategy) => ({
  dados: { verbal_identity: verbal || {}, strategy: strategy || {} },
  onChange: (col, k, val) => col === 'strategy'
    ? onStrategy({ ...(strategy || {}), [k]: val })
    : onVerbal({ ...(verbal || {}), [k]: val }),
})

// ── Culture → Essência ───────────────────────────────────────────────
export function EssenciaSection({ verbal = {}, strategy = {}, onVerbal, onStrategy }) {
  const ed = useEditor(verbal, strategy, onVerbal, onStrategy)
  return <CamposDaMarca mapa={ESSENCIA} {...ed} />
}

// ── Business → Função ────────────────────────────────────────────────
export function NegocioSection({ verbal = {}, strategy = {}, onVerbal, onStrategy }) {
  const ed = useEditor(verbal, strategy, onVerbal, onStrategy)

  // Personas viveram em duas colunas: a extração escreve em `verbal_identity`,
  // e a versão anterior da tela gravava em `strategy`. Marcas reais têm dados
  // em cada uma. Em vez de escolher por elas — e apagar o lado perdedor — a
  // tela mostra o legado e deixa a mesclagem explícita, num clique.
  const legado = (strategy?.personas || []).filter(p => p?.nome)
  const mesclar = () => {
    const jaTem = new Set((verbal?.personas || []).map(p => (p.nome || '').toLowerCase()))
    const convertidas = legado
      .filter(p => !jaTem.has((p.nome || '').toLowerCase()))
      .map(p => ({ nome: p.nome, demografia: p.descricao || '', dor: p.dores || '',
                   motivacao: p.objetivos || '', objecoes: '' }))
    onVerbal({ ...(verbal || {}), personas: [...(verbal?.personas || []), ...convertidas] })
    onStrategy({ ...(strategy || {}), personas: [] })
  }

  const aviso = legado.length ? (
    <Alert severity="info" action={<Button size="small" onClick={mesclar} sx={{ fontWeight: 700 }}>Mesclar</Button>}>
      {legado.length} {legado.length > 1 ? 'personas ficaram' : 'persona ficou'} na estrutura antiga desta tela.
      Mesclar traz {legado.length > 1 ? 'elas' : 'ela'} para a lista abaixo, sem apagar o que já existe.
    </Alert>
  ) : null

  return <CamposDaMarca mapa={FUNCAO} {...ed} extras={{ 'Para quem': aviso }} />
}

// ── Business → Experiência (UX · UI · Journey · design.md) ───────────
// Os campos vêm do mapa como em toda seção; o que é próprio daqui é o design.md
// — artefato GERADO do que a marca já tem, então não é campo: é saída, e vai
// depois do documento.
export function ExperienciaSection({ strategy = {}, onStrategy, brandNome, visual, tokens, assets }) {
  const ed = useEditor({}, strategy, () => {}, onStrategy)
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
    <Box>
      <CamposDaMarca mapa={EXPERIENCIA} {...ed} />

      <Box sx={{ maxWidth: 860, mt: 2 }}>
        <Typography component="h2" sx={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.012em', mb: 1 }}>
          design.md
        </Typography>
        <Typography sx={{ fontSize: 15, lineHeight: 1.75, color: 'text.secondary', mb: 2, maxWidth: '74ch' }}>
          Gerado do que a marca já tem — paleta, tipografia, tokens, logos, princípios. Nada para
          preencher duas vezes. É o artefato que times de produto e agentes de IA consomem.
        </Typography>
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
      </Box>
    </Box>
  )
}

// ── Communication → Personalidade ────────────────────────────────────
export function PersonalidadeSection({ verbal = {}, strategy = {}, onVerbal, onStrategy, brandId }) {
  const ed = useEditor(verbal, strategy, onVerbal, onStrategy)
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

  // O que a IA aprendeu é PROPOSTA, não fato consumado. Antes isso ficava numa
  // caixa bonita que ninguém podia aceitar nem recusar — a marca via o cérebro
  // afirmando algo sobre ela e não tinha o que fazer a respeito.
  //
  // Aceitar grava como território declarado. Descartar registra a recusa
  // daquela VERSÃO: o cérebro continua aprendendo e pode propor de novo quando
  // evoluir, mas não insiste com o que já foi recusado.
  const versaoRecusada = strategy?.territorio_recusado
  const jaDecidido = territorioIA && (
    versaoRecusada === territorioIA.v || strategy?.territorio === territorioIA.valor
  )
  const aceitar = () => onStrategy({
    ...(strategy || {}), territorio: territorioIA.valor, territorio_versao: territorioIA.v,
  })
  const descartar = () => onStrategy({ ...(strategy || {}), territorio_recusado: territorioIA.v })

  const aprendido = territorioIA && !jaDecidido ? (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'rgba(127,119,221,0.06)', borderColor: 'rgba(127,119,221,0.35)' }}>
      <Stack direction="row" spacing={1.25} alignItems="flex-start">
        <PsychologyOutlinedIcon sx={{ color: PALETTE.data.neutro, fontSize: 20, mt: 0.25 }} />
        <Box>
          <Typography variant="overline" sx={{ color: PALETTE.data.neutro, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Território aprendido pela IA (v{territorioIA.v})
          </Typography>
          <Typography variant="body2" sx={{ lineHeight: 1.6 }}>{territorioIA.valor}</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 1.75 }}>
            <Button size="small" variant="contained" onClick={aceitar} sx={{ fontWeight: 700 }}>
              Adicionar ao território
            </Button>
            <Button size="small" color="inherit" onClick={descartar} sx={{ fontWeight: 700, color: 'text.secondary' }}>
              Descartar
            </Button>
          </Stack>
        </Box>
      </Stack>
    </Paper>
  ) : null

  return <CamposDaMarca mapa={PERSONALIDADE} {...ed} extras={{ 'Territórios': aprendido }} />
}
