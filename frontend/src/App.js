import React from 'react';
import { Container, AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import { BrowserRouter, Routes, Route, Link as RouterLink } from 'react-router-dom';

// Импорт страниц
import Dashboard from './pages/Dashboard';
import CreateStack from './pages/CreateStack';
import History from './pages/History';

function App() {
    return (
        <BrowserRouter>
            <Box sx={{ flexGrow: 1 }}>
                <AppBar position="static">
                    <Toolbar>
                        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                            Sandbox Orchestrator
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
    );
}

export default App;