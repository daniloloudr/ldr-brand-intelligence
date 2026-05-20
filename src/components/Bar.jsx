import LinearProgress from '@mui/material/LinearProgress'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export function Bar({ score, color }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box sx={{ flex: 1 }}>
        <LinearProgress
          variant="determinate"
          value={score * 10}
          sx={{
            height: 5,
            '& .MuiLinearProgress-bar': { backgroundColor: color },
          }}
        />
      </Box>
      <Typography
        variant="caption"
        sx={{ fontSize: 15, fontWeight: 900, color, minWidth: 20, textAlign: 'right' }}
      >
        {score}
      </Typography>
    </Box>
  )
}
