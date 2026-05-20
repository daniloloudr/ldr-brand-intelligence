import Typography from '@mui/material/Typography'

export function Lbl({ children, color }) {
  return (
    <Typography
      variant="overline"
      sx={{ color: color || 'primary.main', display: 'block', mb: 1.25 }}
    >
      {children}
    </Typography>
  )
}
