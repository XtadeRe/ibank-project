import React, { Suspense, useEffect, useState, useContext, useCallback, memo, useMemo, useTransition } from 'react';
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
const LazyUptimeChart = React.lazy(() => import('./UptimeChart'));
import { ApiContext } from '../App';

function ContainerList() {
    const [stacks, setStacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [creatingStacks, setCreatingStacks] = useState({});
    const [refreshing, setRefreshing] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, stackId: null, stackName: '' });
    const [lastUpdate, setLastUpdate] = useState(null);
    const [isPending, startTransition] = useTransition();

    const API_URL = useContext(ApiContext);

    const fetchDashboardData = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);

        try {
            setLoading(true);
            const startTime = performance.now();

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
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            if (response.data.success) {
                const validStacks = response.data.stacks.filter(stack => stack.id != null && stack.id !== undefined && stack.id !== '');
                setStacks(validStacks);
                setLastUpdate(new Date());
                console.log(`Загружено ${validStacks.length} стеков из ${response.data.stacks.length} за ${response.data.duration_ms || (performance.now() - startTime)}мс`);
                console.log(`Отфильтровано ${response.data.stacks.length - validStacks.length} стеков без ID`);
            } else {
                setError(response.data.error || 'Ошибка загрузки');
            }
        } catch (err) {
            console.error('Ошибка получения данных:', err);
            setError('Ошибка соединения с сервером');
        } finally {
            setLoading(false);
            if (showRefresh) setRefreshing(false);
        }
    }, [API_URL]);

    const checkCreatingStacks = useCallback(() => {
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
    }, [stacks]);

    useEffect(() => {
        checkCreatingStacks();
    }, [checkCreatingStacks]);

    useEffect(() => {
        fetchDashboardData();

        const interval = setInterval(() => {
            fetchDashboardData();
        }, 45000);

        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    const checkStackHealth = useCallback(async (stackId, stackName) => {
        if (!stackId) {
            setError('ID стека не найден');
            return;
        }
        try {
            await axios.post(`${API_URL}/sandboxes/${stackId}/check-health`);
            setError('Проверка завершена');
            setTimeout(() => setError(''), 3000);
        } catch (err) {
            setError('Ошибка проверки стека');
        }
    }, [API_URL]);

    const restartStack = useCallback(async (stackId, stackName) => {
        if (!stackId) {
            setError('ID стека не найден');
            return;
        }
        try {
            await axios.post(`${API_URL}/sandboxes/${stackId}/restart`);
            startTransition(() => fetchDashboardData());
        } catch (err) {
            setError('Ошибка перезапуска стека');
        }
    }, [API_URL, fetchDashboardData, startTransition]);

    const deleteStack = useCallback(async () => {
        if (!deleteDialog.stackName) {
            setError('Имя стека не найдено');
            return;
        }
        try {
            await axios.post(`${API_URL}/docker/stacks/${deleteDialog.stackName}/delete`);
            setDeleteDialog({ open: false, stackId: null, stackName: '' });
            startTransition(() => fetchDashboardData());
        } catch (err) {
            setError('Ошибка удаления стека');
        }
    }, [API_URL, deleteDialog.stackName, fetchDashboardData, startTransition]);

    const handleManualRefresh = useCallback(() => {
        startTransition(() => fetchDashboardData(true));
    }, [fetchDashboardData, startTransition]);

    const getStatusColor = useCallback((status) => {
        switch(status) {
            case 'running': return 'success';
            case 'partial': return 'warning';
            case 'stopped': return 'default';
            case 'failed': return 'error';
            default: return 'default';
        }
    }, []);

    const getStatusText = useCallback((status) => {
        switch(status) {
            case 'running': return 'Запущен';
            case 'partial': return 'Частично';
            case 'stopped': return 'Остановлен';
            case 'created': return 'Ожидает запуска'
            case 'exited': return 'Остановлен';
            case 'paused': return 'Пауза';
            case 'failed': return 'Ошибка';
            default: return status;
        }
    }, []);

    const getStackStatus = useCallback((stack) => {
        if (creatingStacks[stack.name]) return 'creating';
        if (!stack.containers || stack.containers.length === 0) return 'no_containers';
        const allRunning = stack.containers.every(c => c.state === 'running');
        if (allRunning) return 'running';
        const anyRunning = stack.containers.some(c => c.state === 'running');
        if (anyRunning) return 'partial';
        return 'stopped';
    }, [creatingStacks]);

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
                <DialogTitle>Удаление стека</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Вы уверены, что хотите удалить стек "{deleteDialog.stackName}"?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteDialog({ open: false, stackId: null, stackName: '' })}>
                        Отмена
                    </Button>
                    <Button onClick={deleteStack} color="error" variant="contained">
                        Удалить
                    </Button>
                </DialogActions>
            </Dialog>

            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h4">
                    Управление стеками
                </Typography>
                <Box display="flex" alignItems="center" gap={2}>
                    {lastUpdate && (
                        <Typography variant="caption" color="textSecondary">
                            Обновлено: {lastUpdate.toLocaleTimeString()}
                        </Typography>
                    )}
                    <Tooltip title="Обновить список">
                        <IconButton onClick={handleManualRefresh} disabled={refreshing}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {error && (
                <Alert severity={error.includes('завершена') ? 'success' : 'error'}
                       sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {Object.keys(creatingStacks).length > 0 && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: '#e3f2fd' }}>
                    <Typography variant="subtitle1" gutterBottom>
                        Создание стеков: {Object.keys(creatingStacks).join(', ')}
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
                                            <Suspense fallback={<Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CircularProgress size={40} /></Box>}>
                                                <Box sx={{ minWidth: '600px', width: '100%' }}>
                                                    <LazyUptimeChart
                                                        stackId={stack.id}
                                                        stackName={stack.name}
                                                    />
                                                </Box>
                                            </Suspense>
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
                        Стеки не созданы
                    </Typography>
                    <Button variant="contained" color="primary" component="a" href="/create">
                        Создать новый стек
                    </Button>
                </Paper>
            )}
        </Box>
    );
}

export default memo(ContainerList);