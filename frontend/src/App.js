import React, { createContext } from 'react';
import { Container, AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import { BrowserRouter, Routes, Route, Link as RouterLink } from 'react-router-dom';


import Dashboard from './pages/Dashboard';
import CreateStack from './pages/CreateStack';
import History from './pages/History';

export const ApiContext = createContext();

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

function App() {
    return (
        <ApiContext.Provider value={API_URL}>
            <BrowserRouter>
                <Box sx={{ flexGrow: 1 }}>
                    <AppBar position="static">
                        <Toolbar>
                            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                                <Button
                                    color="inherit"
                                    variant="h6"
                                    component={RouterLink}
                                    to="/">
                                Sandbox Orchestrator
                                </Button>
                            </Typography>
                            <Button
                                color="inherit"
                                component={RouterLink}
                                to="/"
                            >
                                Дашборд
                            </Button>
                            <Button
                                color="inherit"
                                component={RouterLink}
                                to="/create"
                            >
                                Создать стек
                            </Button>
                            <Button
                                color="inherit"
                                component={RouterLink}
                                to="/history"
                            >
                                История
                            </Button>
                        </Toolbar>
                    </AppBar>

                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/create" element={<CreateStack />} />
                        <Route path="/history" element={<History />} />
                    </Routes>
                </Box>
            </BrowserRouter>
        </ApiContext.Provider>
    );
}

export default App;