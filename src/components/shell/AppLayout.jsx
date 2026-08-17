import { useState, useEffect } from "react";
import { navigate, PRODUCT_NAME } from '../../lib/helpers';
import { Box, Typography, IconButton, InputBase, Popover, Stack, Divider, Button, Tooltip, Menu, MenuItem, ListItemIcon, Collapse } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import SearchIcon from "@mui/icons-material/Search";

const NAV_W = 220;
const TOP_H = 56;
const TEAL  = "#0D9E7A";
const PINK  = "#E8185A";

export function AppLayout({
  isDark, onToggleTheme,
  nav, currentRoute, onNavigate,
  user, userName, workspace, planoLabel, planoUsoText,
  onLogout,
  userMenu,
  topBanner,
  onSearch, searchValue,
  bellCount, bellContent,
  brandLockup,   // { nome, logoUrl?, logoSvg? } — lockup MARCA.brandcode no topo
  children,
}) {
  const [bellAnchor, setBellAnchor] = useState(null);
  const [userAnchor, setUserAnchor] = useState(null);

  // Acordeão da nav: um grupo aberto por vez; o grupo da rota ativa abre sozinho
  const activeGroupIdx = nav.findIndex(e => e.type === "group" && (e.active || e.children?.some(c => c.active)));
  const [openGroup, setOpenGroup] = useState(activeGroupIdx >= 0 ? activeGroupIdx : 0);
  useEffect(() => { if (activeGroupIdx >= 0) setOpenGroup(activeGroupIdx); }, [activeGroupIdx]);
  const initial = (userName || "?").charAt(0).toUpperCase();
  const hasBrandLockup = !!(brandLockup?.logoSvg || brandLockup?.logoUrl || brandLockup?.nome);

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      {topBanner}

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <Box component="header" sx={{
        position: "fixed", top: topBanner ? 37 : 0, left: 0, right: 0, height: TOP_H,
        bgcolor: "background.paper", borderBottom: 1, borderColor: "divider",
        display: "flex", alignItems: "center",
        zIndex: 100,
        boxShadow: theme => `0 1px 8px ${theme.palette.mode === "dark" ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.06)"}`,
      }}>
        {/* Logo (alinhado com sidebar) */}
        <Box sx={{
          width: NAV_W, flexShrink: 0, height: "100%",
          px: 2.5, display: "flex", alignItems: "center", gap: 1,
          borderRight: 1, borderColor: "divider", overflow: "hidden",
        }}>
          {/* Lockup do produto: MARCA.brandcode — usa o logo cadastrado da marca
              quando existir; senão o nome do workspace. Sem marca (admin/sistema),
              o lockup é só a wordmark do produto — LOUDR é a empresa, não o app. */}
          {brandLockup?.logoSvg ? (
            <Box sx={{ height: 36, display: "flex", alignItems: "center", "& svg": { height: 36, width: "auto", maxWidth: 150 } }}
              dangerouslySetInnerHTML={{ __html: brandLockup.logoSvg }} />
          ) : brandLockup?.logoUrl ? (
            <Box component="img" src={brandLockup.logoUrl} alt={brandLockup?.nome || ""} sx={{ height: 36, maxWidth: 150, objectFit: "contain", display: "block" }} />
          ) : brandLockup?.nome ? (
            <Typography sx={{ fontSize: 16, fontWeight: 900, letterSpacing: "-0.02em", color: "text.primary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {brandLockup.nome}
            </Typography>
          ) : null}
          <Typography sx={{
            fontSize: hasBrandLockup ? 13 : 16, fontWeight: hasBrandLockup ? 800 : 900,
            letterSpacing: hasBrandLockup ? 0 : "-0.02em",
            color: hasBrandLockup ? PINK : "text.primary",
            whiteSpace: "nowrap", mb: hasBrandLockup ? "-2px" : 0,
          }}>
            {hasBrandLockup ? `.${PRODUCT_NAME}` : PRODUCT_NAME}
          </Typography>
        </Box>

        {/* Search */}
        <Box sx={{ flex: 1, px: 2.5, maxWidth: 380 }}>
          <Box sx={{ position: "relative" }}>
            <SearchIcon sx={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "text.disabled", fontSize: 16, pointerEvents: "none" }} />
            <InputBase
              value={searchValue || ""}
              onChange={e => onSearch?.(e.target.value)}
              placeholder="Buscar..."
              sx={{
                width: "100%", py: 0.85, pl: 4, pr: 1.5,
                bgcolor: "background.default", border: 1, borderColor: "divider", borderRadius: 1,
                fontSize: 13,
              }}
            />
          </Box>
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* Workspace + Plano (chip compacto) */}
        {workspace && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", mr: 1.5 }}>
            <Typography sx={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2, color: "text.primary", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {workspace.nome}
            </Typography>
            <Typography sx={{ fontSize: 10, color: "text.disabled", letterSpacing: "0.05em", textTransform: "uppercase", fontWeight: 700 }}>
              {planoLabel}{planoUsoText ? ` · ${planoUsoText}` : ""}
            </Typography>
          </Box>
        )}

        {/* Theme toggle */}
        <Tooltip title={isDark ? "Modo claro" : "Modo escuro"}>
          <IconButton onClick={onToggleTheme} size="small" sx={{ width: 34, height: 34, border: 1, borderColor: "divider", borderRadius: 1, color: "text.secondary", mx: 0.25 }}>
            {isDark ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
          </IconButton>
        </Tooltip>

        {/* Bell */}
        <Box sx={{ position: "relative", mx: 0.25 }}>
          <IconButton onClick={e => setBellAnchor(e.currentTarget)} size="small" sx={{ width: 34, height: 34, border: 1, borderColor: "divider", borderRadius: 1, color: "text.secondary" }}>
            <NotificationsNoneOutlinedIcon fontSize="small" />
          </IconButton>
          {bellCount > 0 && (
            <Box sx={{
              position: "absolute", top: 2, right: 2, minWidth: 14, height: 14, px: 0.5,
              bgcolor: PINK, color: "#fff", borderRadius: 99, fontSize: 9, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none",
            }}>{bellCount}</Box>
          )}
        </Box>

        {/* Divider */}
        <Box sx={{ width: "1px", height: 24, bgcolor: "divider", mx: 0.75 }} />

        {/* Avatar + nome (dropdown) */}
        <Box
          component="button"
          onClick={e => setUserAnchor(e.currentTarget)}
          sx={{
            display: "flex", alignItems: "center", gap: 1, pr: 2.5, pl: 1,
            background: "none", border: "none", cursor: "pointer", height: "100%",
            "&:hover": { bgcolor: theme => theme.palette.action.hover },
          }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: "50%", bgcolor: TEAL, color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 14, fontWeight: 900, flexShrink: 0,
          }}>{initial}</Box>
          <Box sx={{ display: { xs: "none", sm: "block" }, maxWidth: 140, textAlign: "left" }}>
            <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</Typography>
            <Typography sx={{ fontSize: 10, color: "text.disabled", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</Typography>
          </Box>
          <KeyboardArrowDownIcon sx={{ fontSize: 16, color: "text.disabled", display: { xs: "none", sm: "block" } }} />
        </Box>
      </Box>

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <Box component="aside" sx={{
        width: NAV_W, position: "fixed", top: (topBanner ? 37 : 0) + TOP_H, bottom: 0, left: 0,
        bgcolor: "background.paper", borderRight: 1, borderColor: "divider",
        overflowY: "auto", display: "flex", flexDirection: "column",
        zIndex: 50,
      }}>
        <Typography sx={{ px: 2.5, pt: 2, pb: 0.75, fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "text.disabled" }}>
          Menu
        </Typography>

        <Box component="nav" sx={{ flex: 1, px: 1.25, py: 0.5 }}>
          {nav.map((entry, i) => {
            // ── Grupo: cabeçalho clicável (acordeão) + filhos indentados ──
            if (entry.type === "group") {
              const Icon = entry.icon;
              const open = openGroup === i;
              return (
                <Box key={i} sx={{ mt: 1.25 }}>
                  <Box component="button" onClick={() => setOpenGroup(open ? -1 : i)} sx={{
                    display: "flex", alignItems: "center", gap: 1.25, px: 1.5, py: 0.75, width: "100%",
                    border: "none", bgcolor: "transparent", cursor: "pointer", borderRadius: 1,
                    color: "text.secondary", textAlign: "left",
                    "&:hover": { color: "text.primary", bgcolor: theme => theme.palette.action.hover },
                  }}>
                    {Icon && <Box sx={{ display: "flex", alignItems: "center", opacity: 0.7 }}><Icon /></Box>}
                    <Box sx={{ flex: 1, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>{entry.label}</Box>
                    <KeyboardArrowDownIcon sx={{ fontSize: 15, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none", opacity: 0.6 }} />
                  </Box>
                  <Collapse in={open} timeout={150}>
                  {entry.children.map(c => c.type === "sub" ? (
                    // Subtítulo (3º nível da árvore — ex.: Culture/Business/Communication)
                    <Box key={`sub-${c.label}`} sx={{
                      pl: 4, pr: 1.5, pt: 1.25, pb: 0.4, fontSize: 9.5, fontWeight: 800,
                      letterSpacing: "0.12em", textTransform: "uppercase", color: "text.disabled",
                    }}>{c.label}</Box>
                  ) : (
                    <Box key={c.label} component="button" onClick={() => !c.locked && onNavigate(c.hash)} disabled={c.locked}
                      sx={{
                        display: "flex", alignItems: "center", gap: 1, width: "100%", pl: 4, pr: 1.5, py: 0.8, mb: 0.1,
                        border: "none", borderLeft: 3, borderLeftColor: c.active ? TEAL : "transparent",
                        bgcolor: c.active ? theme => theme.palette.action.selected : "transparent",
                        color: c.active ? "text.primary" : "text.secondary",
                        fontWeight: c.active ? 700 : 500, fontSize: 12.5,
                        textAlign: "left", cursor: c.locked ? "not-allowed" : "pointer", borderRadius: 1,
                        opacity: c.locked ? 0.5 : 1, transition: "all 0.15s",
                        "&:hover": !c.locked && { color: "text.primary", bgcolor: theme => theme.palette.action.hover },
                      }}>
                      <Box sx={{ flex: 1 }}>{c.label}</Box>
                      {c.locked && <Box sx={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.1em", color: PINK, border: `1px solid ${PINK}33`, px: 0.6, py: 0.05, textTransform: "uppercase" }}>Pro</Box>}
                    </Box>
                  ))}
                  </Collapse>
                </Box>
              );
            }
            // ── Item simples de 1º nível — MESMO peso visual dos grupos ──
            const Icon = entry.icon;
            return (
              <Box key={i} component="button" onClick={() => onNavigate(entry.hash)}
                sx={{
                  display: "flex", alignItems: "center", gap: 1.25, width: "100%", px: 1.5, py: 0.75, mt: 1.25,
                  border: "none", borderLeft: 3, borderLeftColor: entry.active ? TEAL : "transparent",
                  bgcolor: entry.active ? theme => theme.palette.action.selected : "transparent",
                  color: entry.active ? "text.primary" : "text.secondary",
                  fontWeight: 800, fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase",
                  textAlign: "left", cursor: "pointer", borderRadius: 1, transition: "all 0.15s",
                  "&:hover": { color: "text.primary", bgcolor: theme => theme.palette.action.hover },
                }}>
                {Icon && <Box sx={{ display: "flex", alignItems: "center", color: entry.active ? TEAL : "currentColor", opacity: entry.active ? 1 : 0.7 }}><Icon /></Box>}
                <Box sx={{ flex: 1 }}>{entry.label}</Box>
              </Box>
            );
          })}
        </Box>

        {/* Logout no rodapé */}
        <Box sx={{ p: 1.25, borderTop: 1, borderColor: "divider" }}>
          <Button onClick={onLogout} startIcon={<LogoutOutlinedIcon />} fullWidth
            sx={{ justifyContent: "flex-start", color: PINK, fontWeight: 700, fontSize: 12, textTransform: "none" }}>
            Sair da conta
          </Button>
        </Box>
      </Box>

      {/* ── Main ───────────────────────────────────────────────── */}
      <Box component="main" sx={{
        ml: `${NAV_W}px`, pt: `${TOP_H + (topBanner ? 37 : 0)}px`,
        minHeight: "100vh",
      }}>
        {children}
      </Box>

      {/* ── Bell popover ───────────────────────────────────────── */}
      <Popover
        open={Boolean(bellAnchor)}
        anchorEl={bellAnchor}
        onClose={() => setBellAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { width: 380, maxHeight: 520, mt: 1, borderRadius: 2 } } }}
      >
        {bellContent ? bellContent({ close: () => setBellAnchor(null) }) : (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              Sem notificações.
            </Typography>
          </Box>
        )}
      </Popover>

      {/* ── User menu ──────────────────────────────────────────── */}
      <Menu
        open={Boolean(userAnchor)}
        anchorEl={userAnchor}
        onClose={() => setUserAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 220, mt: 1, borderRadius: 2 } } }}
      >
        <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}>
          <Typography sx={{ fontSize: 12, fontWeight: 800, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</Typography>
          <Typography sx={{ fontSize: 10, color: "text.disabled", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</Typography>
        </Box>
        {(userMenu || []).map(item => (
          <MenuItem
            key={item.hash}
            onClick={() => { setUserAnchor(null); navigate(item.hash); }}
            sx={{ fontSize: 13, fontWeight: 600, py: 1 }}
          >
            {item.label}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem
          onClick={() => { setUserAnchor(null); onLogout?.(); }}
          sx={{ fontSize: 13, fontWeight: 700, color: PINK, py: 1 }}
        >
          Sair da conta
        </MenuItem>
      </Menu>
    </Box>
  );
}
