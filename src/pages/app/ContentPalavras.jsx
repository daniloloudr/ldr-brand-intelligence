import { useState, useMemo } from 'react'
import {
  Box, Typography, Chip, Button,
} from '@mui/material'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import InfoOutlinedIcon        from '@mui/icons-material/InfoOutlined'
import CheckCircleOutlineIcon  from '@mui/icons-material/CheckCircleOutline'
import AutoAwesomeIcon         from '@mui/icons-material/AutoAwesome'
import { useWorkspace }        from '../../lib/WorkspaceContext'
import { ContentGerarDrawer }  from './ContentGerarDrawer'

const OPOR_COR   = { alta: '#0D9E7A', media: '#EF9F27', baixa: '#8A9AB0' }
const VOL_LABEL  = { alto: 'Alto', medio: 'Médio', baixo: 'Nicho' }
const VOL_COR    = { alto: '#0D9E7A', medio: '#EF9F27', baixo: '#8A9AB0' }
const INTENT_COR = { informacional: '#4A9ECC', transacional: '#E8185A', navegacional: '#7F77DD' }
const INTENT_LABEL = { informacional: 'Informacional', transacional: 'Transacional', navegacional: 'Navegacional' }

function oporLabel(o) {
  return o === 'alta' ? 'Alto' : o === 'media' ? 'Médio' : 'Baixo'
}

const CLOUD_SIZE = {
  alto:  { fontSize: 16, fontWeight: 800, opacity: 1 },
  medio: { fontSize: 13, fontWeight: 700, opacity: 0.85 },
  baixo: { fontSize: 11, fontWeight: 600, opacity: 0.65 },
}

function KeywordCloud({ clusters, clusterAtivo }) {
  const visible = clusterAtivo ? clusters.filter(c => c.id === clusterAtivo) : clusters
  const shuffled = useMemo(() => {
    const all = []
    for (const cl of visible) {
      for (const kw of (cl.keywords || []).filter(k => k.tipo === 'proprio' || !k.tipo)) {
        all.push({ ...kw, cor: cl.cor })
      }
    }
    return [...all].sort(() => Math.random() - 0.5)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterAtivo, clusters.map(c => c.id).join(',')])

  if (!shuffled.length) return null
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'center', justifyContent: 'center', minHeight: 80 }}>
        {shuffled.map((kw, i) => {
          const size = CLOUD_SIZE[kw.volume] || CLOUD_SIZE.medio
          return (
            <Typography key={i} component="span" sx={{
              ...size, color: kw.cor, opacity: size.opacity,
              cursor: 'default', lineHeight: 1.3, transition: 'opacity 0.15s',
              '&:hover': { opacity: 1 },
            }}>
              {kw.termo}
            </Typography>
          )
        })}
      </Box>
    </Box>
  )
}

const COL = '1fr 130px 90px 160px 130px'

function TableHeader() {
  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: COL, px: 3, py: 1.5,
      bgcolor: 'background.default', borderBottom: '2px solid', borderColor: 'divider',
    }}>
      {['Palavra-chave', 'Oportunidade', 'Volume', 'Intenção', ''].map(h => (
        <Typography key={h} variant="overline" color="text.disabled" sx={{ fontSize: '0.6rem' }}>{h}</Typography>
      ))}
    </Box>
  )
}

function KeywordRow({ kw, cor, onGerar }) {
  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: COL, px: 3, py: '11px', alignItems: 'center',
      borderBottom: '1px solid', borderColor: 'divider',
      '&:last-child': { borderBottom: 'none' },
      '&:hover': { bgcolor: 'rgba(255,255,255,0.02)' },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: cor, flexShrink: 0 }} />
        <Typography sx={{ fontSize: 13, fontWeight: 600 }}>{kw.termo}</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <LocalFireDepartmentIcon sx={{ fontSize: 13, color: OPOR_COR[kw.oportunidade] }} />
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: OPOR_COR[kw.oportunidade] }}>
          {oporLabel(kw.oportunidade)}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 12, fontWeight: 700, color: VOL_COR[kw.volume] || '#8A9AB0' }}>
        {VOL_LABEL[kw.volume] || kw.volume}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <InfoOutlinedIcon sx={{ fontSize: 13, color: INTENT_COR[kw.intencao] || '#8A9AB0' }} />
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: INTENT_COR[kw.intencao] || '#8A9AB0' }}>
          {INTENT_LABEL[kw.intencao] || kw.intencao}
        </Typography>
      </Box>
      <Button size="small" variant="outlined" color="inherit"
        startIcon={<AutoAwesomeIcon sx={{ fontSize: '11px !important' }} />}
        onClick={() => onGerar(kw)}
        sx={{ fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', px: 1 }}>
        Gerar conteúdo
      </Button>
    </Box>
  )
}

export function ContentPalavras({ clusters }) {
  const { workspace }            = useWorkspace()
  const [clusterAtivo, setClusterAtivo] = useState(null)
  const [drawerItem, setDrawerItem]     = useState(null)
  const visible = clusterAtivo ? clusters.filter(c => c.id === clusterAtivo) : clusters
  const totalProprias = visible.reduce((s, c) =>
    s + (c.keywords || []).filter(k => k.tipo === 'proprio' || !k.tipo).length, 0)

  return (
    <Box>
      {/* Cluster filter */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 4, alignItems: 'center', flexWrap: 'wrap' }}>
        <Typography variant="overline" color="text.disabled" sx={{ fontSize: '0.6rem', flexShrink: 0 }}>
          Filtrar por território:
        </Typography>
        {clusters.map(cl => (
          <Chip key={cl.id} label={cl.nome} size="small"
            onClick={() => setClusterAtivo(clusterAtivo === cl.id ? null : cl.id)}
            sx={{
              cursor: 'pointer', fontWeight: 700, fontSize: '0.62rem',
              bgcolor: clusterAtivo === cl.id ? cl.cor : cl.cor + '18',
              color:   clusterAtivo === cl.id ? '#fff' : cl.cor,
              '&:hover': { bgcolor: clusterAtivo === cl.id ? cl.cor : cl.cor + '30' },
            }} />
        ))}
        {clusterAtivo && (
          <Button size="small" onClick={() => setClusterAtivo(null)}
            sx={{ fontWeight: 700, fontSize: 11, color: 'text.secondary', minWidth: 0, p: '2px 8px' }}>
            Limpar
          </Button>
        )}
      </Box>

      {/* Cloud */}
      <KeywordCloud clusters={clusters} clusterAtivo={clusterAtivo} />

      {/* Tabela */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <CheckCircleOutlineIcon sx={{ fontSize: 18, color: '#0D9E7A' }} />
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 900, lineHeight: 1.2 }}>
            Palavras-chave que você já se apropria
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Termos que o seu site já cobre e ranqueia
          </Typography>
        </Box>
        <Chip label={`${totalProprias} keywords`} size="small"
          sx={{ ml: 'auto', fontWeight: 700, fontSize: '0.65rem',
            bgcolor: 'rgba(13,158,122,0.12)', color: '#0D9E7A', height: 20 }} />
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <TableHeader />
        {visible.map(cl => {
          const kws = (cl.keywords || []).filter(k => k.tipo === 'proprio' || !k.tipo)
          if (!kws.length) return null
          return (
            <Box key={cl.id}>
              <Box sx={{ px: 3, py: 1.25, borderBottom: '1px solid', borderColor: 'divider',
                position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                <Typography sx={{ fontSize: 13, fontWeight: 800, color: cl.cor }}>{cl.nome}</Typography>
              </Box>
              {kws.map((kw, j) => <KeywordRow key={j} kw={kw} cor={cl.cor} onGerar={kw => setDrawerItem(kw)} />)}
            </Box>
          )
        })}
      </Box>

      <ContentGerarDrawer
        item={drawerItem}
        workspace={workspace}
        open={!!drawerItem}
        onClose={() => setDrawerItem(null)}
      />
    </Box>
  )
}
