import { useState } from "react";
import { navigate, PRODUCT_NAME } from "../lib/helpers";
import { supabase } from "../lib/supabase";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { themeLight } from "../lib/theme";
import { Wordmark } from "../components/Wordmark";

// Login — template "Sign-in side" do MUI: showcase à esquerda, card do form
// à direita. 100% componentes MUI (decisão Danilo 2026-08-17); a auth do
// Supabase segue idêntica.
const PILARES = [
  { icon: MenuBookOutlinedIcon,      titulo: "Estratégia",  desc: "O brand book vivo: essência, negócio, experiência e personalidade num lugar só." },
  { icon: InsightsOutlinedIcon,      titulo: "Inteligência", desc: "Diagnóstico, concorrentes, escuta e tendências — atualizados sozinhos." },
  { icon: PhotoLibraryOutlinedIcon,  titulo: "Estúdio",     desc: "Imagem, vídeo e texto gerados no tom da marca, julgados antes de sair." },
  { icon: AutoAwesomeOutlinedIcon,   titulo: "Copiloto",    desc: "Conversa com mãos: lê a inteligência da marca e cria a peça." },
];

function Showcase() {
  return (
    <Stack sx={{ flexDirection: "column", gap: 4, maxWidth: 450 }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 600, letterSpacing: "-0.02em" }}>
          A marca no meio da operação.
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1.5 }}>
          Diagnóstico com IA, inteligência de mercado e criação on-brand — a memória
          viva da sua marca, em tempo real.
        </Typography>
      </Box>
      {PILARES.map(({ icon: Icon, titulo, desc }) => (
        <Stack key={titulo} direction="row" sx={{ gap: 2, alignItems: "flex-start" }}>
          <Icon sx={{ color: "text.secondary" }} />
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{titulo}</Typography>
            <Typography variant="body2" color="text.secondary">{desc}</Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
}

export function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true); setError("");
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) { setError("E-mail ou senha incorretos. Tente de novo."); return; }
    onLogin(data.user);
    navigate("/app");
  }

  return (
    <ThemeProvider theme={themeLight}>
      <CssBaseline enableColorScheme />
      <Stack component="main" sx={{ justifyContent: "center", minHeight: "100vh", p: 2 }}>
        <Stack
          direction={{ xs: "column-reverse", md: "row" }}
          sx={{ justifyContent: "center", alignItems: "center", gap: { xs: 6, md: 12 }, mx: "auto" }}
        >
          <Box sx={{ display: { xs: "none", md: "flex" } }}><Showcase /></Box>

          <Card variant="outlined" sx={{ width: "100%", maxWidth: 420 }}>
            <CardContent sx={{ p: 4, display: "flex", flexDirection: "column", gap: 2 }}>
              <Wordmark size={26} sx={{ mb: 0.5 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: -1.5 }}>
                Entre na sua conta
              </Typography>

              {error && <Alert severity="error">{error}</Alert>}

              <Box component="form" onSubmit={handleLogin}
                sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <FormControl>
                  <FormLabel htmlFor="email">E-mail</FormLabel>
                  <TextField
                    id="email" type="email" name="email" placeholder="voce@empresa.com"
                    autoComplete="email" autoFocus required fullWidth
                    value={email} onChange={e => setEmail(e.target.value)}
                  />
                </FormControl>
                <FormControl>
                  <FormLabel htmlFor="password">Senha</FormLabel>
                  <TextField
                    id="password" type="password" name="password" placeholder="••••••••"
                    autoComplete="current-password" required fullWidth
                    value={password} onChange={e => setPassword(e.target.value)}
                  />
                </FormControl>
                <Button type="submit" fullWidth variant="contained" disabled={loading}>
                  {loading ? <CircularProgress size={22} color="inherit" /> : "Entrar"}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Stack>
      </Stack>
    </ThemeProvider>
  );
}

export default LoginPage;
