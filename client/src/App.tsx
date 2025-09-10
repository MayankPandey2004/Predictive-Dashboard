import { Box, createTheme, CssBaseline, ThemeProvider } from "@mui/material"
import { useMemo } from "react"
import { themeSettings } from "./theme"
import { BrowserRouter, Route, Routes } from "react-router-dom"
import Navbar from "./scenes/navbar";
import Dashboard from "./scenes/dashboard";
import Predictions from "./scenes/predictions"
import SplashScreen from "./components/SplashScreen";
import PricingAI from "./scenes/pricing-ai/PricingAI";
import DashboardAI from "./scenes/dashboard-ai/DashboardAI";

import { useGetProductsQuery } from "./state/api";

function App() {
  const theme = useMemo(() => createTheme(themeSettings), []);
  const { data: productsFromApi} = useGetProductsQuery();

  return (
    <div className="app">
      <BrowserRouter>
        <SplashScreen />
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box width="100%" height="100%" padding="1rem 2rem 4rem 2rem">
            <Navbar />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/predictions" element={<Predictions />} />
              <Route path="/pricing-ai" element={<PricingAI products={productsFromApi || []} />} />
              <Route path="/dashboard-ai" element={<DashboardAI />} />
            </Routes>
          </Box>
        </ThemeProvider>
      </BrowserRouter>
    </div>
  );
}


export default App
