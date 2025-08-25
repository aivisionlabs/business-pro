"use client";

import React from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

type ProvidersProps = {
  children: React.ReactNode;
};

const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#2563eb", // blue-600
    },
    background: {
      default: "#f8fafc", // slate-50
    },
  },
  shape: {
    borderRadius: 10,
  },
});

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}


