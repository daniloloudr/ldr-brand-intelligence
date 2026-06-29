import { Box, Typography, Stack } from '@mui/material'
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined'
import { PageHeader } from '../../components/shell/PageHeader'

export function StudioVideo() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' }}>
      <PageHeader title="Studio" subtitle="Geração de vídeo" />
      <Stack alignItems="center" justifyContent="center" spacing={1.5} sx={{ flex: 1, textAlign: 'center', p: 4 }}>
        <MovieOutlinedIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
        <Typography variant="h6" fontWeight={900}>Vídeo — em breve</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          Geração de vídeo (image/text-to-video) entra na fase final do Studio,
          sobre a mesma fundação de Imagem e Workflow.
        </Typography>
      </Stack>
    </Box>
  )
}
