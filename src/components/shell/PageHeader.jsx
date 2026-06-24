import { Box, Typography } from "@mui/material";

export function PageHeader({ title, subtitle, action }) {
  return (
    <Box sx={{
      background: theme => theme.palette.background.paper,
      borderBottom: 1, borderColor: "divider",
      px: { xs: 2.5, md: 3.5 }, py: 2,
      display: "flex", alignItems: "center", gap: 2,
    }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: 18, fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.2 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Box>
  );
}
