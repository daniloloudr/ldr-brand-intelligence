import { useState } from 'react'
import {
  Box, Typography, Chip, Button,
} from '@mui/material'
import TrendingUpIcon          from '@mui/icons-material/TrendingUp'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import InfoOutlinedIcon        from '@mui/icons-material/InfoOutlined'
import AutoAwesomeIcon         from '@mui/icons-material/AutoAwesome'
import { useWorkspace }        from '../../lib/WorkspaceContext'
import { ContentGerarDrawer }  from './ContentGerarDrawer'

const OPOR_COR   = { alta: '#0D9E7A', media: '#EF9F27', baixa: '#8A9AB0' }
const OPOR_SCORE = { alta: 3, media: 2, baixa: 1 }
const VOL_LABEL  = { alto: 'Alto', medio: 'Médio', baixo: 'Nicho' }
const VOL_COR    = { alto: '#0D9E7A', medio: '#EF9F27', baixo: '#8A9AB0' }
const INTENT_COR = { informacional: '#4A9ECC', transacional: '#E8185A', navegacional: '#7F77DD' }
const INTENT_LABEL = { informacional: 'Informacional', transacional: 'Transacional', navegacional: 'Navegacional' }

function oporLabel(o) {
  return o === 'alta' ? 'Alta' : o === 'media' ? 'Média' : 'Baixa'
}

const COL = '1fr 120px 130px 90px 160px 130px'

function TableHeader() {
  return (
    <Box sx={{
      display: 'grid', gridTemplateColumns: COL, px: 3, py: 1.5,
      bgcolor: 'background.default', borderBottom: '2px solid', borderColor: 'divider',
    }}>
      {['Palavra-chave', 'Território', 'Oportunidade', 'Volume', 'Intenção', ''].map(h => (
        <Typography key={h} variant="overline" color="text.disabled" sx={{ fontSize: '0.6rem' }}>{h}</Typography>
      ))}
    </Box>
  )
}

function OporRow({ kw, cor, clusterNome, onGerar }) {
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
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: cor, opacity: 0.85 }}>
        {clusterNome}
      </Typography>
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

export function ContentOportunidades({ clusters }) {
  const { workspace }                   = useWorkspace()
  const [clusterAtivo, setClusterAtivo] = useState(null)
  const [drawerItem, setDrawerItem]     = useState(null)
  const visible = clusterAtivo ? clusters.filter(c => c.id === clusterAtivo) : clusters

  // Flatten all oportunidades, sorted by priority
  const todasOpors = visible
    .flatMap(cl =>
      (cl.keywords || [])
        .filter(k => k.tipo === 'oportunidade')
        .map(k => ({ ...k, clusterNome: cl.nome, cor: cl.cor }))
    )
    .sort((a, b) => (OPOR_SCORE[b.oportunidade] || 0) - (OPOR_SCORE[a.oportunidade] || 0))

  const contAlta  = todasOpors.filter(k => k.oportunidade === 'alta').length
  const contMedia = todasOpors.filter(k => k.oportunidade === 'media').length
  const contBaixa = todasOpors.filter(k => k.oportunidade === 'baixa').length

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

      {/* Summary stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2, mb: 4 }}>
        {[
          { label: 'Alta prioridade',  count: contAlta,  cor: '#0D9E7A', desc: 'Gap crítico — concorrência baixa, volume alto' },
          { label: 'Média prioridade', count: contMedia, cor: '#EF9F27', desc: 'Boas oportunidades para expansão gradual' },
          { label: 'Baixa prioridade', count: contBaixa, cor: '#8A9AB0', desc: 'Nichos específicos e long-tail' },
        ].map(({ label, count, cor, desc }) => (
          <Box key={label} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2,
            p: 2.5, borderTop: `3px solid ${cor}` }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
              <LocalFireDepartmentIcon sx={{ fontSize: 15, color: cor }} />
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: cor, textTransform: 'uppercase',
                letterSpacing: '0.08em' }}>{label}</Typography>
            </Box>
            <Typography sx={{ fontSize: 32, fontWeight: 900, color: cor, lineHeight: 1 }}>{count}</Typography>
            <Typography variant="caption" color="text.disabled" sx={{ lineHeight: 1.4 }}>{desc}</Typography>
          </Box>
        ))}
      </Box>

      {/* Tabela */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <TrendingUpIcon sx={{ fontSize: 18, color: '#EF9F27' }} />
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 900, lineHeight: 1.2 }}>
            Oportunidades de expansão
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Keywords que o seu público busca e o site ainda não cobre — ordenadas por prioridade
          </Typography>
        </Box>
        <Chip label={`${todasOpors.length} oportunidades`} size="small"
          sx={{ ml: 'auto', fontWeight: 700, fontSize: '0.65rem',
            bgcolor: 'rgba(239,159,39,0.12)', color: '#EF9F27', height: 20 }} />
      </Box>

      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <TableHeader />
        {todasOpors.length === 0 ? (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">
              Nenhuma oportunidade encontrada para o filtro selecionado.
            </Typography>
          </Box>
        ) : (
          todasOpors.map((kw, i) => (
            <OporRow key={i} kw={kw} cor={kw.cor} clusterNome={kw.clusterNome} onGerar={kw => setDrawerItem(kw)} />
          ))
        )}
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
