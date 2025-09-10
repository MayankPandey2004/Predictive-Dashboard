// src/components/SplashScreen.tsx
import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { keyframes } from "@emotion/react";

// Fade in elements
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
`;

// Fade out the whole splash
const fadeOut = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`;

const SplashScreen = () => {
  const [startFade, setStartFade] = useState(false);
  const [hide, setHide] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setStartFade(true), 2800);
    const hideTimer = setTimeout(() => setHide(true), 3000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (hide) return null;

  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        height: "100vh",
        width: "100vw",
        bgcolor: "#0f1117",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        color: "#ffffff",
        textAlign: "center",
        px: 2,
        animation: startFade ? `${fadeOut} 0.5s ease forwards` : "none",
      }}
    >
      {/* Centered Finance GIF */}
      <Box
        component="img"
        src="/finance-bg.gif"
        alt="Finance animation"
        sx={{
          width: 120,
          height: 120,
          mb: 3,
        }}
      />

      {/* Title */}
      <Typography
        variant="h3"
        sx={{
          fontWeight: "bold",
          animation: `${fadeIn} 1s ease 0.5s forwards`,
          opacity: 0,
        }}
      >
        FinSight
      </Typography>

      {/* Subtitle */}
      <Typography
        variant="subtitle1"
        sx={{
          fontStyle: "italic",
          color: "#64ffda",
          mt: 1,
          animation: `${fadeIn} 1s ease 1s forwards`,
          opacity: 0,
        }}
      >
        Empowering Data-Driven Finance
      </Typography>
    </Box>
  );
};

export default SplashScreen;
