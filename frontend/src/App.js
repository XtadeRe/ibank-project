import React, { Suspense, lazy, createContext } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  BrowserRouter,
  Routes,
  Route,
  Link as RouterLink,
} from "react-router-dom";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const CreateStack = lazy(() => import("./pages/CreateStack"));
const History = lazy(() => import("./pages/History"));

export const ApiContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000/api";

function App() {
  return (
    <ApiContext.Provider value={API_URL}>
      <BrowserRouter>
        <Box sx={{ flexGrow: 1 }}>
          <AppBar position="static">
            <Toolbar>
              <Typography
                variant="h6"
                component={RouterLink}
                to="/"
                sx={{ flexGrow: 1, textDecoration: "none", color: "inherit" }}
              >
                Sandbox Orchestrator
              </Typography>
              <Button color="inherit" component={RouterLink} to="/">
                Дашборд
              </Button>
              <Button color="inherit" component={RouterLink} to="/create">
                Создать стек
              </Button>
              <Button color="inherit" component={RouterLink} to="/history">
                История
              </Button>
            </Toolbar>
          </AppBar>

          <Suspense
            fallback={
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  minHeight: "50vh",
                }}
              >
                <CircularProgress />
              </Box>
            }
          >
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/create" element={<CreateStack />} />
              <Route path="/history" element={<History />} />
            </Routes>
          </Suspense>
        </Box>
      </BrowserRouter>
    </ApiContext.Provider>
  );
}

export default App;
