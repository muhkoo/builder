import { createTheme } from "@mui/material/styles";

const INK = "#181510";
const PAPER = "#f3ead6";
const PAPER_2 = "#fbf6ec";
const GREEN = "#18b85a";
const CORAL = "#ff5b35";

/**
 * Neo-brutalist editorial theme: warm paper, black ink, one vivid green, hard
 * offset shadows (no blur), square corners, characterful display type. Commits
 * to a clear point of view rather than the default MUI look.
 */
export const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: GREEN, contrastText: "#06140b" },
    secondary: { main: CORAL },
    background: { default: PAPER, paper: PAPER_2 },
    text: { primary: INK, secondary: "#5b5340" },
    divider: INK,
  },
  shape: { borderRadius: 0 },
  typography: {
    fontFamily: '"Spline Sans", system-ui, -apple-system, sans-serif',
    h4: { fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 800, letterSpacing: "-0.02em" },
    h5: { fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 800, letterSpacing: "-0.02em" },
    h6: { fontFamily: '"Bricolage Grotesque", sans-serif', fontWeight: 700, letterSpacing: "-0.01em" },
    button: { textTransform: "none", fontWeight: 700 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: `2px solid ${INK}`,
          boxShadow: `5px 5px 0 ${INK}`,
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          border: `2px solid ${INK}`,
          boxShadow: `3px 3px 0 ${INK}`,
          transition: "transform .08s ease, box-shadow .08s ease",
          "&:hover": { boxShadow: `4px 4px 0 ${INK}`, transform: "translate(-1px,-1px)" },
          "&:active": { boxShadow: `0 0 0 ${INK}`, transform: "translate(3px,3px)" },
          "&.Mui-disabled": { borderColor: "#b8ad93", boxShadow: "none" },
        },
        containedPrimary: { color: "#06140b" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#fffdf7",
          "& fieldset": { borderColor: INK, borderWidth: 2 },
          "&:hover fieldset": { borderColor: INK },
          "&.Mui-focused fieldset": { borderColor: GREEN, borderWidth: 2 },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          fontFamily: '"JetBrains Mono", monospace',
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          fontSize: 12,
        },
      },
    },
    MuiCheckbox: { styleOverrides: { root: { color: INK } } },
    MuiAlert: {
      styleOverrides: {
        root: { border: `2px solid ${INK}`, borderRadius: 0, boxShadow: `3px 3px 0 ${INK}` },
      },
    },
  },
});
