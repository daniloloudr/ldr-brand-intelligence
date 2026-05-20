import Chip from '@mui/material/Chip'
import { PRATICAS } from '../lib/constants'

export function Pill({ children, bg, color }) {
  return (
    <Chip
      label={children}
      size="small"
      sx={{ background: bg, color, fontWeight: 700, height: 22, fontSize: '0.6875rem' }}
    />
  )
}

export const ipill = v =>
  v === 'alto'  ? <Pill bg="#E1F5EE" color="#0B8567">impacto alto</Pill>   :
  v === 'medio' ? <Pill bg="#FEF3C7" color="#92400e">impacto médio</Pill>  :
                  <Pill bg="#F0F4F3" color="#4A5A6A">impacto baixo</Pill>

export const apill = v =>
  v === 'alta'  ? <Pill bg="#FBEAF0" color="#E8185A">ameaça alta</Pill>   :
  v === 'media' ? <Pill bg="#FEF3C7" color="#92400e">ameaça média</Pill>  :
                  <Pill bg="#F0F4F3" color="#4A5A6A">ameaça baixa</Pill>

export const ppill = key => {
  const p = PRATICAS.find(p => p.key === key)
  return p ? <Pill bg={p.color + '22'} color={p.color}>{p.label}</Pill> : null
}
