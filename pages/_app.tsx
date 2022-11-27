import "../styles/globals.css";
import type { AppProps } from "next/app";
import { EntriesContext, EntriesProvider } from "../context/entriesContext";
import { createTheme, ThemeProvider } from "@mui/material/styles";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#4AB5EF",
    },
    secondary: {
      main: "#E85959",
    },
  },
  typography: {
    fontFamily: "Space Grotesk",
  },
});
function MyApp({ Component, pageProps }: AppProps) {
  return (
    <EntriesProvider>
      <ThemeProvider theme={darkTheme}>
        <Component {...pageProps} />
      </ThemeProvider>
    </EntriesProvider>
  );
}

export default MyApp;
