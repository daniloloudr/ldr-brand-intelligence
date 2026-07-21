import { Stack, Button } from '@mui/material'
import { navigate } from '../../lib/helpers';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import MovieOutlinedIcon from '@mui/icons-material/MovieOutlined'
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined'

const TEAL = '#0D9E7A'
const TABS = [
  { key: 'image',    label: 'Imagem',   icon: ImageOutlinedIcon,       hash: b => `#/app/brands/${b}/studio` },
  { key: 'video',    label: 'Vídeo',    icon: MovieOutlinedIcon,       hash: b => `#/app/brands/${b}/studio/video` },
  { key: 'workflow', label: 'Workflow', icon: AccountTreeOutlinedIcon, hash: b => `#/app/brands/${b}/studio/workflow` },
]

export function StudioTabs({ brandId, active }) {
  return (
    <Stack direction="row" spacing={0.5}>
      {TABS.map(t => {
        const on = t.key === active
        const Icon = t.icon
        return (
          <Button key={t.key} size="small" startIcon={<Icon sx={{ fontSize: '16px !important' }} />}
            onClick={() => { navigate(t.hash(brandId)) }}
            sx={{ fontWeight: 800, color: on ? '#fff' : 'text.secondary', bgcolor: on ? TEAL : 'transparent',
              '&:hover': { bgcolor: on ? '#0B8567' : 'action.hover' }, px: 1.5 }}>
            {t.label}
          </Button>
        )
      })}
    </Stack>
  )
}
