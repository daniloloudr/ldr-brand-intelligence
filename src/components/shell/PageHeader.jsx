import { Box, Typography, Stack } from "@mui/material";

// Cabeçalho de página — usado pelo app e pelo admin. 100% MUI: tipografia por
// variante, sem tamanho nem peso escritos na mão.
export function PageHeader({ title, subtitle, action }) {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: "center", gap: 2,
        borderBottom: 1, borderColor: "divider",
        pb: 2, mb: 1,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {typeof title === "string" ? <Typography variant="h5">{title}</Typography> : title}
        {subtitle && (
          <Typography variant="body2" color="text.secondary">{subtitle}</Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Stack>
  );
}

export default PageHeader;
