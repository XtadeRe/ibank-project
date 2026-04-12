import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Chip,
    Button,
    CircularProgress,
    Alert,
    Paper,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    IconButton,
    Tooltip,
    LinearProgress
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import RefreshIcon from '@mui/icons-material/Refresh';
import axios from 'axios';
import UptimeChart from './UptimeChart';
import { ApiContext } from '../App';

function ContainerList() {
    const [stacks, setStacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [creatingStacks, setCreatingStacks] = useState({});
    const [refreshing, setRefreshing] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, stackId: null, stackName: '' });
    const [lastUpdate, setLastUpdate] = useState(null);

    const API_URL = useContext(ApiContext);

    const fetchDashboardData = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);

        try {
            setLoading(true);
            const startTime = performance.now();

            // Добавьте retry-логику
            let response;
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                try {
                    response = await axios.get(`${API_URL}/dashboard-data`, {
                        timeout: 30000
                    });
                    break;
                } catch (err) {
                    attempts++;
                    if (attempts >= maxAttempts) throw err;
                    // Подождать перед повторной попыткой
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            if (response.data.success) {
                setStacks(response.data.stacks);
                setLastUpdate(new Date());
                console.log(`Loaded ${response.data.stacks.length} stacks in ${response.data.duration_ms || (performance.now() - startTime)}ms`);
            } else {
                setError(response.data.error || 'Load error');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            setError('Server connection error');
        } finally {
            setLoading(false);
            if (showRefresh) setRefreshing(false);
        }
    }, [API_URL]);

    useEffect(() => {
        const checkCreatingStacks = () => {
            const currentStacksNames = stacks.map(s => s.name);
            const creating = JSON.parse(localStorage.getItem('creatingStacks') || '[]');
            const now = Date.now();

            const activeStacks = creating.filter(stack => {
                const isExpired = now - stack.timestamp > 300000;
                const isAlreadyDone = currentStacksNames.includes(stack.name);
                return !isExpired && !isAlreadyDone;
            });

            if (activeStacks.length !== creating.length) {
                localStorage.setItem('creatingStacks', JSON.stringify(activeStacks));
            }

            const creatingMap = {};
            activeStacks.forEach(stack => {
                creatingMap[stack.name] = true;
            });
            setCreatingStacks(creatingMap);
        };

        checkCreatingStacks();
    }, [stacks]);

    useEffect(() => {
        fetchDashboardData();

        const interval = setInterval(() => {
            fetchDashboardData();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    const checkStackHealth = async (stackId, stackName) => {
        if (!stackId) {
            setError('Stack ID not found');
            return;
        }
        try {
            await axios.post(`${API_URL}/sandboxes/${stackId}/check-health`);
            setError('Check completed');
            setTimeout(() => setError(''), 3000);
        } catch (err) {
            setError('Stack check error');
        }
    };

    const restartStack = async (stackId, stackName) => {
        if (!stackId) {
            setError('Stack ID not found');
            return;
        }
        try {
            await axios.post(`${API_URL}/sandboxes/${stackId}/restart`);
            setTimeout(() => fetchDashboardData(), 3000);
        } catch (err) {
            setError('Stack restart error');
        }
    };

    const deleteStack = async () => {
        if (!deleteDialog.stackName) {
            setError('Stack name not found');
            return;
        }
        try {
            await axios.post(`${API_URL}/docker/stacks/${deleteDialog.stackName}/delete`);
            setDeleteDialog({ open: false, stackId: null, stackName: '' });
            fetchDashboardData();
        } catch (err) {
            setError('Stack deletion error');
        }
    };

    const handleManualRefresh = () => {
        fetchDashboardData(true);
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'running': return 'success';
            case 'partial': return 'warning';
            case 'stopped': return 'default';
            case 'failed': return 'error';
            default: return 'default';
        }
    };

    const getStatusText = (status) => {
        switch(status) {
            case 'running': return 'Запущен';
            case 'partial': return 'Частично';
            case 'stopped': return 'Остановлен';
            case 'created': return 'Ожидает запуска'
            case 'exited': return 'Остановлен';
            case 'failed': return 'Ошибка';
            default: return status;
        }
    };

    const getStackStatus = (stack) => {
        if (creatingStacks[stack.name]) return 'creating';
        if (!stack.containers || stack.containers.length === 0) return 'no_containers';
        const allRunning = stack.containers.every(c => c.state === 'running');
        if (allRunning) return 'running';
        const anyRunning = stack.containers.some(c => c.state === 'running');
        if (anyRunning) return 'partial';
        return 'stopped';
    };

    if (loading && stacks.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3, maxWidth: '1000px', mx: 'auto' }}>
            <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, stackId: null, stackName: '' })}>
                <DialogTitle>Delete Stack</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the stack "{deleteDialog.stackName}"?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialog({ open: false, stackId: null, stackName: '' })}>
                        Cancel
                    </Button>
                    <Button onClick={deleteStack} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4">
                    Менеджмент стеков
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                    {lastUpdate && (
                        <Typography variant="caption" color="textSecondary">
                            Updated: {lastUpdate.toLocaleTimeString()}
                        </Typography>
                    )}
                    <Tooltip title="Refresh list">
                        <IconButton onClick={handleManualRefresh} disabled={refreshing}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {error && (
                <Alert severity={error.includes('completed') ? 'success' : 'error'}
                       sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {Object.keys(creatingStacks).length > 0 && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: '#e3f2fd' }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Creating stacks: {Object.keys(creatingStacks).join(', ')}
                    </Typography>
                    <LinearProgress sx={{ mt: 1 }} />
                </Paper>
            )}

            {refreshing && <LinearProgress sx={{ mb: 2 }} />}

            <Grid container spacing={3}>
                {stacks.map((stack) => {
                    const status = getStackStatus(stack);
                    return (
                        <Grid width="100%" key={stack.id || stack.name}>
                            <Card>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center">
                                        <Box display="flex" gap={1}>
                                            <Chip
                                                label={stack.git_branch || 'develop'}
                                                size="small"
                                                color={stack.git_branch === 'master' ? 'primary' : 'secondary'}
                                                variant="outlined"
                                            />
                                            <Chip
                                                label={stack.version || 'v1.0.0'}
                                                size="small"
                                                variant="outlined"
                                            />
                                            <Chip
                                                label={status === 'running' ? 'Работает' : status === 'partial' ? 'Частично' : 'Остановлен'}
                                                size="small"
                                                color={getStatusColor(status === 'running' ? 'running' : status === 'partial' ? 'partial' : 'stopped')}
                                            />
                                        </Box>
                                    </Box>

                                    <Typography variant="h6" gutterBottom>
                                        {stack.name}
                                    </Typography>

                                    {stack.containers && stack.containers.map(container => (
                                        <Box key={container.id} sx={{ ml: 2, mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="body2">
                                                    <strong>{container.name?.replace(`${stack.name}_`, '')}:</strong> {container.image}
                                                </Typography>
                                                <Chip
                                                    label={getStatusText(container.state)}
                                                    color={getStatusColor(container.state)}
                                                    size="small"
                                                />
                                            </Box>
                                        </Box>
                                    ))}

                                    <Accordion sx={{ mt: 2 }}>
                                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                            <Typography>Статистика работы</Typography>
                                        </AccordionSummary>
                                        <AccordionDetails sx={{ overflowX: 'auto', p: 0 }}>
                                            <Box sx={{ minWidth: '600px', width: '100%' }}>
                                                <UptimeChart
                                                    stackId={stack.id}
                                                    stackName={stack.name}
                                                />
                                            </Box>
                                        </AccordionDetails>
                                    </Accordion>

                                    <Box display="flex" justifyContent="flex-end" mt={2}>
                                        <Button
                                            size="small"
                                            color="info"
                                            onClick={() => checkStackHealth(stack.id, stack.name)}
                                            startIcon={<HealthAndSafetyIcon />}
                                            sx={{ mr: 1 }}
                                            disabled={!stack.id}
                                        >
                                            Проверить
                                        </Button>
                                        <Button
                                            size="small"
                                            color="primary"
                                            onClick={() => restartStack(stack.id, stack.name)}
                                            startIcon={<RestartAltIcon />}
                                            sx={{ mr: 1 }}
                                            disabled={!stack.id}
                                        >
                                            Перезапуск
                                        </Button>
                                        <Button
                                            size="small"
                                            color="error"
                                            onClick={() => setDeleteDialog({
                                                open: true,
                                                stackId: stack.id,
                                                stackName: stack.name
                                            })}
                                            startIcon={<DeleteOutlined />}
                                        >
                                            Удалить
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {stacks.length === 0 && !loading && Object.keys(creatingStacks).length === 0 && (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="body1" color="textSecondary" gutterBottom>
                        No stacks created
                    </Typography>
                    <Button variant="contained" color="primary" component="a" href="/create">
                        Create New Stack
                    </Button>
                </Paper>
            )}
        </Box>
    );
}

export default ContainerList;