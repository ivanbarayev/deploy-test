"use client";

import { createTheme } from "@mui/material/styles";

const muiTheme = createTheme({
  cssVariables: true,
  typography: {
    fontFamily: "var(--font-sans)",
  },
});

export default muiTheme;
