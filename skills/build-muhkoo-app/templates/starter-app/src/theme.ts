import { createTheme } from "@mui/material/styles";

/** Muhkoo brand theme: vibrant green on dark slate, Inter + JetBrains Mono. */
export const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#58da7d" },
    background: { default: "#0a1929", paper: "#0f2336" },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: ["Inter", "system-ui", "-apple-system", "sans-serif"].join(","),
  },
});
