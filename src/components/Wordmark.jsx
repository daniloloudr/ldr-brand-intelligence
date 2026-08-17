import Box from "@mui/material/Box";
import { useTheme } from "@mui/material/styles";
import logoPreto from "../assets/logo preto.svg";
import logoBranco from "../assets/logo branco.svg";

// Wordmark do produto — lugar ÚNICO onde a assinatura do BR4NDCODE é desenhada.
// Troca sozinho conforme o modo do tema: preto no claro, branco no escuro.
// Quem quiser o símbolo isolado usa `simbolo preto/branco.svg` do mesmo diretório.
export function Wordmark({ size = 20, sx }) {
  const theme = useTheme();
  const src = theme.palette.mode === "dark" ? logoBranco : logoPreto;
  return (
    <Box
      component="img"
      src={src}
      alt="BR4NDCODE"
      sx={{ height: size, width: "auto", display: "block", ...sx }}
    />
  );
}

export default Wordmark;
