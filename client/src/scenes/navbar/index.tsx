import { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import PixIcon from '@mui/icons-material/Pix';
import { Box, Typography, useTheme } from "@mui/material";
import FlexBetween from '../../components/FlexBetween';

const Navbar = () => {
    const { palette } = useTheme();
    const [selected, setSelected] = useState("dashboard");

    useEffect(() => {
        if (location.pathname === "/") {
            setSelected("dashboard");
        } else if (location.pathname === "/predictions") {
            setSelected("predictions");
        } else if (location.pathname === "/pricing-ai") {
            setSelected("pricing-ai");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);
 
    return (
        <FlexBetween mb="0.25rem" p="0.5rem 0rem" color={palette.grey[300]}>
            {/* LEFT SIDE */}
            <FlexBetween gap="0.75rem">
                <PixIcon sx={{fontSize: "28px"}}/>
                <Typography variant='h4' fontSize="16px">
                    FinSight <span style={{color: palette.grey[800], fontSize: "12px"}}>-Mayank Pandey</span>
                </Typography>
            </FlexBetween>

            {/* RIGHT SIDE */}
            <FlexBetween gap="2rem">
                <Box sx={{"&:hover": {color: palette.primary[100]}}}>
                    <Link 
                    to="/"
                    onClick={() => setSelected("dashboard")}
                    style={{
                        color: selected === "dashboard" ? "inherit" : palette.grey[700],
                        textDecoration: "inherit"
                    }}
                    >
                        Dashboard
                    </Link>
                </Box>
                <Box sx={{"&:hover": {color: palette.primary[100]}}}>
                    <Link 
                    to="/predictions"
                    onClick={() => setSelected("predictions")}
                    style={{
                        color: selected === "predictions" ? "inherit" : palette.grey[700],
                        textDecoration: "inherit"
                    }}
                    >
                        Predictions
                    </Link>
                </Box>
                <Box sx={{"&:hover": {color: palette.primary[100]}}}>
                    <Link 
                    to="/pricing-ai"
                    onClick={() => setSelected("pricing-ai")}
                    style={{
                        color: selected === "pricing-ai" ? "inherit" : palette.grey[700],
                        textDecoration: "inherit"
                    }}
                    >
                        Pricing AI
                    </Link>
                </Box>
                <Box sx={{"&:hover": {color: palette.primary[100]}}}>
                    <Link 
                    to="/dashboard-ai"
                    onClick={() => setSelected("dashboard-ai")}
                    style={{
                        color: selected === "dashboard-ai" ? "inherit" : palette.grey[700],
                        textDecoration: "inherit"
                    }}
                    >
                        VisionAI
                    </Link>
                </Box>

            </FlexBetween>
        </FlexBetween>
    )
}

export default Navbar