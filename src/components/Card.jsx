import MuiCard from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'

export function Card({ children, style, sx: sxProp = {} }) {
  return (
    <MuiCard variant="outlined" sx={{ ...(style || {}), ...sxProp }}>
      <CardContent>{children}</CardContent>
    </MuiCard>
  )
}
