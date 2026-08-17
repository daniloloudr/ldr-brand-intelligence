import { Typography } from "@mui/material";
import { PRODUCT_NAME } from "../lib/helpers";

// Wordmark do produto — lugar ÚNICO onde a assinatura do brandcode é desenhada.
// Enquanto a identidade definitiva não chega (bloco de layout do time de criação),
// o lockup é tipográfico; trocar por SVG depois mexe só neste arquivo.
export function Wordmark({ size = 20, color = "text.primary", sx }) {
  return (
    <Typography component="span" sx={{
      fontSize: size, fontWeight: 900, letterSpacing: "-0.03em",
      lineHeight: 1, color, ...sx,
    }}>
      {PRODUCT_NAME}
    </Typography>
  );
}

export default Wordmark;
