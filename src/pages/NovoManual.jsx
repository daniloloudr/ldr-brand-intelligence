import { useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, IconButton, Stack, TextField, Box, Typography, Alert, Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { supabase } from "../lib/supabase";

const EMPTY = { empresa: "", contexto: "" };

export function NovoDiagnosticoDialog({ open, onClose, user, onCreate }) {
  const [entradas, setEntradas] = useState([{ ...EMPTY }]);
  const [gerando, setGerando]   = useState(false);
  const [error, setError]       = useState("");

  function reset() {
    setEntradas([{ ...EMPTY }]);
    setError("");
  }

  function handleClose() {
    if (gerando) return;
    reset();
    onClose();
  }

  function addEntrada() {
    setEntradas(prev => [...prev, { ...EMPTY }]);
  }

  function removeEntrada(idx) {
    setEntradas(prev => prev.length === 1 ? prev : prev.filter((_, i) => i !== idx));
  }

  function updateEntrada(idx, key, val) {
    setEntradas(prev => prev.map((e, i) => i === idx ? { ...e, [key]: val } : e));
  }

  async function handleSubmit(e) {
    e?.preventDefault?.();
    const validas = entradas.filter(en => en.empresa.trim());
    if (!validas.length || gerando) return;
    setGerando(true);
    setError("");
    try {
      const userName = user.user_metadata?.full_name || user.email.split("@")[0];
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sessão expirada. Faça login novamente.");

      const criadas = [];
      for (const ent of validas) {
        const { data: diagRow, error: insErr } = await supabase
          .from("diagnosticos")
          .insert({
            user_id:    user.id,
            user_email: user.email,
            user_name:  userName,
            empresa:    ent.empresa.trim(),
            publico:    false,
            tipo:       "manual",
            status:     "running",
          })
          .select()
          .single();
        if (insErr || !diagRow) throw new Error(insErr?.message || "Não foi possível criar o registro.");

        fetch("/.netlify/functions/diagnostico-gerar-background", {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
          body:    JSON.stringify({
            empresa:        ent.empresa.trim(),
            contexto:       ent.contexto.trim() || undefined,
            diagnostico_id: diagRow.id,
          }),
        }).catch(() => {});

        criadas.push(diagRow);
      }

      onCreate?.(criadas);
      reset();
      setGerando(false);
      onClose();
    } catch (err) {
      setGerando(false);
      setError(err.message || "Erro inesperado. Tente novamente.");
    }
  }

  const totalValido = entradas.filter(en => en.empresa.trim()).length;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 900, pb: 0 }}>Novo diagnóstico</DialogTitle>
      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
            Adicione uma ou mais empresas. Cada uma gera um diagnóstico em paralelo.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Stack spacing={2.5}>
            {entradas.map((ent, idx) => (
              <Box key={idx}>
                {entradas.length > 1 && (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: "text.secondary", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                      Empresa #{idx + 1}
                    </Typography>
                    <IconButton
                      onClick={() => removeEntrada(idx)}
                      disabled={gerando}
                      size="small"
                      aria-label="Remover empresa"
                      sx={{ color: "text.disabled", "&:hover": { color: "error.main" } }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
                <Stack spacing={2}>
                  <TextField
                    label="Empresa ou domínio"
                    placeholder="ex: Nubank, farm.com.br"
                    value={ent.empresa}
                    onChange={e => updateEntrada(idx, "empresa", e.target.value)}
                    required
                    fullWidth
                    size="medium"
                    disabled={gerando}
                    autoFocus={idx === 0}
                    InputProps={{ sx: { fontSize: 14, py: 0.5 } }}
                    InputLabelProps={{ sx: { fontSize: 14 } }}
                  />
                  <TextField
                    label="Contexto adicional (opcional)"
                    placeholder="ex: fintech B2B, lançou novo produto em 2024…"
                    value={ent.contexto}
                    onChange={e => updateEntrada(idx, "contexto", e.target.value)}
                    multiline
                    rows={2}
                    fullWidth
                    size="medium"
                    disabled={gerando}
                    InputProps={{ sx: { fontSize: 14 } }}
                    InputLabelProps={{ sx: { fontSize: 14 } }}
                  />
                </Stack>
                {idx < entradas.length - 1 && <Divider sx={{ mt: 2.5 }} />}
              </Box>
            ))}
            <Button
              onClick={addEntrada}
              disabled={gerando}
              startIcon={<AddIcon />}
              sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700 }}
            >
              Adicionar empresa
            </Button>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={handleClose} disabled={gerando} color="inherit">Cancelar</Button>
          <Button type="submit" disabled={!totalValido || gerando} variant="contained" endIcon={<ArrowForwardIcon />}>
            {gerando ? "Iniciando…" : totalValido > 1 ? `Gerar ${totalValido} diagnósticos` : "Gerar diagnóstico"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
