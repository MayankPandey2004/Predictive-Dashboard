export const tokens = {
  grey: {
    100: "#fdf6f1", // very light warm beige
    200: "#f6e9dd",
    300: "#e8d6c4",
    400: "#d9bfa7",
    500: "#caa88a",
    600: "#a3886e",
    700: "#7c6852",
    800: "#554836",
    900: "#2e281a",
  },
  primary: {
    // warm peach-orange
    100: "#ffeede",
    200: "#ffd5bb",
    300: "#ffbb99",
    400: "#ffa277",
    500: "#ff8955",
    600: "#cc6e44",
    700: "#995333",
    800: "#663922",
    900: "#331e11",
  },
  secondary: {
    // golden ochre
    100: "#fff4d6",
    200: "#ffe8ad",
    300: "#ffdd85",
    400: "#ffd15c",
    500: "#ffc633",
    600: "#cc9e29",
    700: "#99761f",
    800: "#664f14",
    900: "#33270a",
  },
  tertiary: {
    // muted maroon / burgundy
    500: "#a55658",
  },
  background: {
    light: "#2d2d34", // unchanged
    main: "#1f2026",  // unchanged
  },
};

// mui theme settings
export const themeSettings = {
  palette: {
    primary: {
      ...tokens.primary,
      main: tokens.primary[500],
      light: tokens.primary[400],
    },
    secondary: {
      ...tokens.secondary,
      main: tokens.secondary[500],
    },
    tertiary: {
      ...tokens.tertiary,
    },
    grey: {
      ...tokens.grey,
      main: tokens.grey[500],
    },
    background: {
      default: tokens.background.main,
      light: tokens.background.light,
    },
  },
  typography: {
    fontFamily: ["Inter", "sans-serif"].join(","),
    fontSize: 12,
    h1: {
      fontFamily: ["Inter", "sans-serif"].join(","),
      fontSize: 32,
    },
    h2: {
      fontFamily: ["Inter", "sans-serif"].join(","),
      fontSize: 24,
    },
    h3: {
      fontFamily: ["Inter", "sans-serif"].join(","),
      fontSize: 20,
      fontWeight: 800,
      color: tokens.grey[200],
    },
    h4: {
      fontFamily: ["Inter", "sans-serif"].join(","),
      fontSize: 14,
      fontWeight: 600,
      color: tokens.grey[300],
    },
    h5: {
      fontFamily: ["Inter", "sans-serif"].join(","),
      fontSize: 12,
      fontWeight: 400,
      color: tokens.grey[500],
    },
    h6: {
      fontFamily: ["Inter", "sans-serif"].join(","),
      fontSize: 10,
      color: tokens.grey[700],
    },
  },
};