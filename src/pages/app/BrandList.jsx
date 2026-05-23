import { useState, useEffect } from 'react'
import {
  Box, Typography, Card, CardContent, CardActionArea, Button,
  CircularProgress, Chip, Avatar,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder'
import { useWorkspace } from '../../lib/WorkspaceContext'
import { supabase } from '../../lib/supabase'
import { PLANOS } from '../../lib/constants'
import { fmtDate } from '../../lib/helpers'

function statusColor(status) {
  if (status === 'active') return '#0D9E7A'
  if (status === 'draft')  return '#EF9F27'
  return '#8A9AB0'
}

function statusLabel(status) {
  if (status === 'active') return 'Ativo'
  if (status === 'draft')  return 'Rascunho'
  return status
}

function BrandCard({ brand, onClick }) {
  const color = statusColor(brand.status)
  const initials = brand.nome.slice(0, 2).toUpperCase()

  return (
    <Card sx={{ border: '1px solid', borderColor: 'divider', cursor: 'pointer' }}>
      <CardActionArea onClick={onClick} sx={{ p: 0 }}>
        <CardContent sx={{ p: '20px 24px', '&:last-child': { pb: '20px' } }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            {brand.logo_url ? (
              <Avatar src={brand.logo_url} alt={brand.nome}
                sx={{ width: 44, height: 44, borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }} />
            ) : (
              <Avatar sx={{ width: 44, height: 44, borderRadius: 1.5, bgcolor: '#0D9E7A18', color: '#0D9E7A', fontWeight: 900, fontSize: 16, fontFamily: "'Cairo', sans-serif" }}>
                {initials}
              </Avatar>
            )}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={800} fontSize={15} noWrap>{brand.nome}</Typography>
              {brand.slug && (
                <Typography variant="caption" color="text.disabled">{brand.slug}</Typography>
              )}
            </Box>
            <Chip
              label={statusLabel(brand.status)}
              size="small"
              sx={{ bgcolor: color + '18', color, fontWeight: 700, fontSize: '0.6rem', height: 18, flexShrink: 0 }}
            />
          </Box>
          <Typography variant="caption" color="text.disabled">
            Criado em {fmtDate(brand.created_at)}
          </Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}

export function BrandList() {
  const { workspace } = useWorkspace()
  const [brands, setBrands]   = useState([])
  const [loading, setLoading] = useState(true)

  const plano  = PLANOS[workspace?.plano] || PLANOS.trial
  const limite = plano.marcas === Infinity ? null : (plano.marcas || 1)

  useEffect(() => {
    if (!workspace?.id) return
    load()
  }, [workspace?.id])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('brands')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
    setBrands(data || [])
    setLoading(false)
  }

  const podeNova = !limite || brands.length < limite

  return (
    <Box sx={{ p: 4 }}>

      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 4 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={900} letterSpacing="-0.02em">Brand OS</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Gerencie suas marcas, brand books e assistentes.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          disabled={!podeNova || loading}
          onClick={() => { window.location.hash = '#/app/brands/new' }}
          sx={{ fontWeight: 800, flexShrink: 0 }}
        >
          Nova marca
        </Button>
      </Box>

      {/* Contador */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="caption" color="text.secondary">
          {brands.length}{limite ? `/${limite}` : ''} marca{brands.length !== 1 ? 's' : ''}
          {limite ? ` · plano ${plano.nome}` : ''}
        </Typography>
        {!podeNova && (
          <Chip label="Limite atingido — faça upgrade" size="small"
            onClick={() => { window.location.hash = '#/app/workspace' }}
            sx={{ bgcolor: 'rgba(239,159,39,0.1)', color: '#EF9F27', fontWeight: 700, fontSize: '0.6rem', height: 18, cursor: 'pointer' }} />
        )}
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : brands.length === 0 ? (
        <Card sx={{ p: 5, textAlign: 'center', border: '1px dashed', borderColor: 'divider' }}>
          <BookmarkBorderIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 2 }} />
          <Typography fontWeight={800} mb={1}>Nenhuma marca ainda</Typography>
          <Typography variant="body2" color="text.secondary" mb={3} maxWidth={360} mx="auto">
            Crie sua primeira marca para montar o brand book, usar o assistente e aprovar campanhas.
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => { window.location.hash = '#/app/brands/new' }}>
            Criar primeira marca
          </Button>
        </Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
          {brands.map(brand => (
            <BrandCard
              key={brand.id}
              brand={brand}
              onClick={() => { window.location.hash = `#/app/brands/${brand.id}` }}
            />
          ))}
        </Box>
      )}
    </Box>
  )
}
