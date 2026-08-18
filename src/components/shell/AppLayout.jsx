import { useState, useEffect } from "react";
import { navigate, PRODUCT_NAME } from "../../lib/helpers";
import { Wordmark } from "../Wordmark";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import ListSubheader from "@mui/material/ListSubheader";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import Badge from "@mui/material/Badge";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import Popover from "@mui/material/Popover";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import Chip from "@mui/material/Chip";
import SearchIcon from "@mui/icons-material/Search";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";

// Shell do app — 100% MUI (decisão Danilo, 2026-08-17), na arquitetura do
// referência do Google Analytics: AppBar de largura total, rail de ícones
// sempre visível e painel de seção recolhível.
// O contrato de props é o mesmo de antes: as 36 telas não sabem que o
// layout foi trocado por baixo.
const RAIL_W  = 68;    // coluna de ícones — sempre visível
const PANEL_W = 240;   // painel da seção — é o que recolhe

export function AppLayout({
  isDark, onToggleTheme,
  nav, currentRoute, onNavigate,
  user, userName, workspace, planoLabel, planoUsoText,
  onLogout,
  userMenu,
  topBanner,
  onSearch, searchValue,
  bellCount, bellContent,
  brandLockup,   // { nome, logoUrl?, logoSvg? } — lockup MARCA.BR4NDCODE
  children,
}) {
  const [bellAnchor, setBellAnchor] = useState(null);
  const [userAnchor, setUserAnchor] = useState(null);

  // Menu recolhível — devolve largura ao conteúdo. A escolha persiste.
  const [navAberto, setNavAberto] = useState(() => {
    try { return localStorage.getItem("brandcode-nav-aberto") !== "0" } catch { return true }
  });
  const alternarNav = () => setNavAberto(v => {
    const p = !v;
    try { localStorage.setItem("brandcode-nav-aberto", p ? "1" : "0") } catch { /* ok */ }
    return p;
  });

  // Qual seção o painel está mostrando. Segue a rota ativa, mas o usuário
  // pode navegar pelo rail sem sair da página atual.
  // Só seção COM filhos governa o painel. Início e Copiloto são destinos, não
  // seções: acompanhar a rota deles jogaria no painel uma única linha repetindo
  // o nome do item que a pessoa acabou de clicar.
  const temFilhos = (e) => !!e?.children?.length;
  const idxAtivo = nav.findIndex(e => temFilhos(e) && (e.active || e.children.some(c => c.active)));
  const idxInicialComFilhos = nav.findIndex(temFilhos);
  const [railIdx, setRailIdx] = useState(idxAtivo >= 0 ? idxAtivo : Math.max(idxInicialComFilhos, 0));
  useEffect(() => { if (idxAtivo >= 0) setRailIdx(idxAtivo); }, [idxAtivo]);

  const initial = (userName || "?").charAt(0).toUpperCase();
  const secao = nav[railIdx];
  const itensDoPainel = secao?.children || [];
  const go = (hash) => { onNavigate ? onNavigate(hash) : navigate(hash); };
  // Clique no rail: troca o painel; item sem filhos navega direto.
  const abrirSecao = (i, entry) => {
    // Item sem segundo nível é só um destino: navega e pronto. Abrir o painel
    // aqui mostrava uma linha só, repetindo o que a pessoa acabou de clicar —
    // e ainda tirava da vista a seção onde ela estava.
    if (!temFilhos(entry)) { if (entry.hash) go(entry.hash); return; }
    setRailIdx(i);
    if (!navAberto) setNavAberto(true);
  };
  const hasLockup = !!(brandLockup?.logoSvg || brandLockup?.logoUrl || brandLockup?.nome);

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
    <AppBar position="fixed" color="inherit" elevation={0}
      sx={theme => ({ zIndex: theme.zIndex.drawer + 1, borderBottom: 1, borderColor: "divider" })}>
        {/* Header no padrão Analytics: assinatura do produto grande,
            divisor, contexto do CLIENTE, e a busca ocupando o meio. */}
        <Toolbar sx={{ gap: 2 }}>
          <Tooltip title={navAberto ? "Recolher menu" : "Expandir menu"}>
            <IconButton edge="start" size="small" onClick={alternarNav}>
              <MenuIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          <Wordmark size={26} />

          {hasLockup && (
            <>
              <Divider orientation="vertical" flexItem sx={{ my: 1.5 }} />
              {brandLockup?.logoSvg ? (
                <Box sx={{ display: "flex", alignItems: "center", "& svg": { height: 22, width: "auto", maxWidth: 150 } }}
                  dangerouslySetInnerHTML={{ __html: brandLockup.logoSvg }} />
              ) : brandLockup?.logoUrl ? (
                <Box component="img" src={brandLockup.logoUrl} alt={brandLockup?.nome || ""}
                  sx={{ height: 22, maxWidth: 150, objectFit: "contain", display: "block" }} />
              ) : (
                <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600 }}>{brandLockup.nome}</Typography>
              )}
            </>
          )}

          <TextField
            size="small"
            placeholder="Buscar..."
            value={searchValue || ""}
            onChange={e => onSearch?.(e.target.value)}
            sx={{ flex: 1, maxWidth: 520, ml: 2 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
                ),
              },
            }}
          />
          <Box sx={{ flexGrow: 1 }} />
          {planoLabel && (
            <Chip size="small" variant="outlined"
              label={planoUsoText ? `${planoLabel} · ${planoUsoText}` : planoLabel} />
          )}
          <Tooltip title={isDark ? "Modo claro" : "Modo escuro"}>
            <IconButton onClick={onToggleTheme} size="small">
              {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <IconButton size="small" onClick={e => setBellAnchor(e.currentTarget)}>
            <Badge badgeContent={bellCount || 0} color="primary">
              <NotificationsNoneIcon fontSize="small" />
            </Badge>
          </IconButton>
          <IconButton size="small" onClick={e => setUserAnchor(e.currentTarget)}>
            <Avatar sx={{ width: 30, height: 30, fontSize: 14, bgcolor: "secondary.main", color: "secondary.contrastText", fontWeight: 700 }}>{initial}</Avatar>
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* ─── Navegação: rail de ícones + painel ──────────────────
          Estrutura do Google Analytics (referência do Danilo): uma coluna
          estreita e SEMPRE visível com as seções em ícone, e ao lado um
          painel com o conteúdo da seção escolhida. O botão do header
          recolhe só o painel — o rail nunca some, então nunca se perde
          o acesso à navegação. */}
      <Box component="nav" sx={{ display: { xs: "none", md: "flex" }, flexShrink: 0 }}>

        {/* Rail */}
        <Box sx={{
          width: RAIL_W, flexShrink: 0, borderRight: 1, borderColor: "divider",
          bgcolor: "background.paper", display: "flex", flexDirection: "column",
        }}>
          <Toolbar />
          <List dense sx={{ py: 1 }}>
            {nav.map((entry, i) => {
              const Icon = entry.icon;
              const ativo = entry.active || entry.children?.some(c => c.active);
              const selecionado = railIdx === i;
              return (
                <Tooltip key={`rail-${entry.label}-${i}`} title={entry.label} placement="right">
                  <ListItemButton
                    onClick={() => abrirSecao(i, entry)}
                    sx={{
                      justifyContent: "center", py: 1.25, mx: 1, mb: 0.5, borderRadius: 2,
                      color: ativo ? "secondary.dark" : "text.secondary",
                      bgcolor: selecionado ? "action.selected" : "transparent",
                    }}
                  >
                    {Icon && <ListItemIcon sx={{ minWidth: 0, color: "inherit" }}><Icon /></ListItemIcon>}
                  </ListItemButton>
                </Tooltip>
              );
            })}
          </List>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ p: 1.5, display: "flex", justifyContent: "center" }}>
            <IconButton size="small" onClick={e => setUserAnchor(e.currentTarget)}>
              <Avatar sx={{ width: 32, height: 32, fontSize: 13, bgcolor: "secondary.main", color: "secondary.contrastText", fontWeight: 700 }}>{initial}</Avatar>
            </IconButton>
          </Box>
        </Box>

        {/* Painel da seção — é ele que recolhe.
            A largura anima; o conteúdo NÃO é desmontado (só fica escondido
            por overflow), senão o texto reflui durante a transição e a
            animação treme. */}
        <Box sx={theme => ({
          width: navAberto ? PANEL_W : 0,
          flexShrink: 0, overflowX: "hidden", overflowY: "auto",
          borderRight: navAberto ? 1 : 0, borderColor: "divider",
          bgcolor: "background.paper",
          transition: theme.transitions.create(["width", "border-right-width"], {
            easing: theme.transitions.easing.easeInOut,
            duration: theme.transitions.duration.standard,
          }),
        })}>
          <Box sx={{ width: PANEL_W }}>
            <Toolbar />
            {secao && (
              <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
                <Typography variant="overline" color="text.secondary" component="div" noWrap>
                  {secao.label}
                </Typography>
              </Box>
            )}
            <List dense>
              {itensDoPainel.map((c, j) => c.type === "sub" ? (
                <ListSubheader key={`p-${c.label}-${j}`} disableSticky sx={{ lineHeight: "32px", bgcolor: "transparent" }}>
                  {c.label}
                </ListSubheader>
              ) : (
                <ListItemButton key={`p-${c.label}-${j}`} selected={!!c.active} onClick={() => go(c.hash)}
                  sx={{ mx: 1, borderRadius: 2,
                        "&.Mui-selected": { bgcolor: "action.selected", color: "secondary.dark", fontWeight: 600 } }}>
                  <ListItemText primary={c.label} slotProps={{ primary: { noWrap: true } }} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        </Box>
      </Box>


      {/* ─── Conteúdo ───────────────────────────────────────────── */}
      {/* Coluna flex de altura fixa: a AppBar não rola e o conteúdo rola
          dentro. É o que permite telas de altura cheia (chat do Copiloto,
          canvas de Fluxos) usarem height:100% sem calc() adivinhando o
          tamanho do chrome — foi o que cortava o chat. */}
      <Box component="main" sx={{
        flexGrow: 1, minWidth: 0, height: "100vh",
        display: "flex", flexDirection: "column", bgcolor: "background.default",
      }}>
        {/* espaçador da AppBar fixa */}
        <Toolbar sx={{ flexShrink: 0 }} />

        {topBanner}

        <Stack spacing={2} sx={{ p: 3, pb: 6, flex: 1, minHeight: 0, overflow: "auto",
          // páginas de altura cheia (chat, canvas) se declaram com flex:1;
          // as demais seguem com altura de conteúdo e rolam aqui dentro
          "& > *": { minHeight: 0 } }}>
          {children}
        </Stack>
      </Box>

      {/* ─── Popovers ───────────────────────────────────────────── */}
      <Popover
        open={!!bellAnchor} anchorEl={bellAnchor} onClose={() => setBellAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Box sx={{ width: 340, maxHeight: 420, overflow: "auto" }}>
          {typeof bellContent === "function"
            ? bellContent({ close: () => setBellAnchor(null) })
            : bellContent || <ListItem><ListItemText secondary="Nada por aqui." /></ListItem>}
        </Box>
      </Popover>

      <Menu open={!!userAnchor} anchorEl={userAnchor} onClose={() => setUserAnchor(null)}>
        {(userMenu || []).map(m => (
          <MenuItem key={m.label} onClick={() => { setUserAnchor(null); go(m.hash); }}>
            {m.label}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={() => { setUserAnchor(null); onLogout?.(); }}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          Sair da conta
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default AppLayout;
