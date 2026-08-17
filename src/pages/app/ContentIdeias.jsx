import { useState } from 'react'
import {
  Box, Typography, Card, Chip, Button, ToggleButtonGroup, ToggleButton,
} from '@mui/material'
import AutoAwesomeIcon         from '@mui/icons-material/AutoAwesome'
import LocalFireDepartmentIcon from '@mui/icons-material/LocalFireDepartment'
import { ContentGerarDrawer }  from './ContentGerarDrawer'
import { PALETTE } from '../../lib/theme'

const OPOR_COR = { alta: PALETTE.data.positivo, media: PALETTE.data.atencao, baixa: PALETTE.neutral[400] }

const FORMATO_COR = {
  Artigo:     PALETTE.data.info,
  Vídeo:      PALETTE.data.critico,
  Post:       PALETTE.data.neutro,
  Newsletter: PALETTE.data.positivo,
  Webinar:    PALETTE.data.atencao,
}

const INTENT_COR = { informacional: PALETTE.data.info, transacional: PALETTE.data.critico, navegacional: PALETTE.data.neutro }
const INTENT_LABEL = { informacional: 'Informacional', transacional: 'Transacional', navegacional: 'Navegacional' }

function IdeiaCard({ ideia, clusterCor, clusterNome, onGerar }) {
  const formatoCor = FORMATO_COR[ideia.formato] || PALETTE.neutral[400]
  const intentCor  = INTENT_COR[ideia.intencao] || PALETTE.neutral[400]

  return (
    <Card sx={{
      p: 3, border: '1px solid', borderColor: 'divider',
      borderTop: `3px solid ${clusterCor}`,
      display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      {/* Badges */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Chip label={clusterNome} size="small"
          sx={{ height: 20, fontSize: '0.58rem', fontWeight: 800,
            bgcolor: clusterCor + '18', color: clusterCor }} />
        <Chip label={ideia.formato} size="small"
          sx={{ height: 20, fontSize: '0.58rem', fontWeight: 800,
            bgcolor: formatoCor + '18', color: formatoCor }} />
        <Chip label={INTENT_LABEL[ideia.intencao] || ideia.intencao} size="small"
          sx={{ height: 20, fontSize: '0.58rem', fontWeight: 700,
            bgcolor: intentCor + '12', color: intentCor }} />
      </Box>

      {/* Título */}
      <Typography sx={{ fontSize: 16, fontWeight: 900, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
        {ideia.titulo}
      </Typography>

      {/* Relevância */}
      <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
        <Typography variant="overline" color="text.disabled" sx={{ display: 'block', mb: 0.5, fontSize: '0.58rem' }}>
          Por que vai atrair tráfego?
        </Typography>
        <Typography sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1.6 }}>
          {ideia.relevancia}
        </Typography>
      </Box>

      {/* Ideia */}
      <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid', borderColor: 'divider', borderRadius: 1.5 }}>
        <Typography variant="overline" color="text.disabled" sx={{ display: 'block', mb: 0.5, fontSize: '0.58rem' }}>
          Descrição do conteúdo
        </Typography>
        <Typography sx={{ fontSize: 12, lineHeight: 1.6 }}>
          {ideia.ideia}
        </Typography>
      </Box>

      {/* CTA */}
      <Button variant="contained" size="small"
        startIcon={<AutoAwesomeIcon sx={{ fontSize: '12px !important' }} />}
        onClick={onGerar}
        sx={{ fontWeight: 800, fontSize: 11, mt: 'auto', alignSelf: 'flex-start' }}>
        Gerar conteúdo
      </Button>
    </Card>
  )
}

const FORMATOS = ['Todos', 'Artigo', 'Vídeo', 'Post', 'Newsletter', 'Webinar']

export function ContentIdeias({ ideias, clusters, workspace }) {
  const [filtroFormato, setFiltroFormato] = useState('Todos')
  const [drawerItem, setDrawerItem]       = useState(null)

  const clusterMap = Object.fromEntries(clusters.map(c => [c.id, c]))

  const ideiasVisiveis = filtroFormato === 'Todos'
    ? ideias
    : ideias.filter(i => i.formato === filtroFormato)

  const formatosPresentes = ['Todos', ...new Set(ideias.map(i => i.formato).filter(Boolean))]

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <Box>
          <Typography sx={{ fontSize: 15, fontWeight: 900, lineHeight: 1.2 }}>
            Ideias de conteúdo para {workspace?.nome || workspace?.dominio}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Geradas por IA a partir dos territórios de keywords do seu site
          </Typography>
        </Box>
        <Chip
          icon={<LocalFireDepartmentIcon />}
          label={`${ideias.length} ideias geradas`}
          size="small"
          sx={{ fontWeight: 700, fontSize: '0.7rem',
            bgcolor: 'primary.main', color: '#fff', height: 26,
            '& .MuiChip-icon': { color: '#fff', fontSize: 14 } }}
        />
      </Box>

      {/* Filtro de formato */}
      <Box sx={{ mb: 4 }}>
        <ToggleButtonGroup
          value={filtroFormato}
          exclusive
          onChange={(_, v) => { if (v) setFiltroFormato(v) }}
          size="small"
          sx={{ flexWrap: 'wrap', gap: '0.5px',
            '& .MuiToggleButton-root': { px: 2, py: 0.5, fontSize: 12, fontWeight: 700,
              fontFamily: "'Cairo', sans-serif", borderRadius: '4px !important',
              border: '1px solid !important', borderColor: 'divider !important',
            },
          }}
        >
          {formatosPresentes.map(f => (
            <ToggleButton key={f} value={f}
              sx={{ color: filtroFormato === f ? (FORMATO_COR[f] || 'primary.main') + ' !important' : undefined }}>
              {f}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      {/* Grid de cards */}
      {ideiasVisiveis.length === 0 ? (
        <Box sx={{ p: 5, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 2 }}>
          <Typography color="text.secondary" variant="body2">
            Nenhuma ideia com esse formato.
          </Typography>
        </Box>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 3 }}>
          {ideiasVisiveis.map((ideia, i) => {
            const cl = clusterMap[ideia.cluster]
            return (
              <IdeiaCard
                key={ideia.id || i}
                ideia={ideia}
                clusterCor={cl?.cor || PALETTE.data.positivo}
                clusterNome={cl?.nome || ideia.cluster}
                onGerar={() => setDrawerItem({ ...ideia, _tipo: 'ideia' })}
              />
            )
          })}
        </Box>
      )}

      <ContentGerarDrawer
        item={drawerItem}
        workspace={workspace}
        open={!!drawerItem}
        onClose={() => setDrawerItem(null)}
      />
    </Box>
  )
}
