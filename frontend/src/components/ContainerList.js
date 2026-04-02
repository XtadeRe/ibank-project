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

    // ОДИН запрос для всей страницы
    const fetchDashboardData = useCallback(async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);

        try {
            setLoading(true);
            const startTime = performance.now();

            // Все данные за 1 запрос!
            const response = await axios.get(`${API_URL}/dashboard-data`, {
                timeout: 30000
            });

            if (response.data.success) {
                setStacks(response.data.stacks);
                setLastUpdate(new Date());
                console.log(`✅ Загружено ${response.data.stacks.length} стеков за ${response.data.duration_ms || (performance.now() - startTime)}ms`);
            } else {
                setError(response.data.error || 'Ошибка загрузки');
            }

        } catch (err) {
            console.error('Fetch error:', err);
            setError('Ошибка подключения к серверу');
        } finally {
            setLoading(false);
            if (showRefresh) setRefreshing(false);
        }
    }, [API_URL]);

    // Проверка статуса создаваемых стеков из localStorage
    useEffect(() => {
        const checkCreatingStacks = () => {
            const creating = JSON.parse(localStorage.getItem('creatingStacks') || '[]');
            const now = Date.now();
            const activeStacks = creating.filter(stack => now - stack.timestamp < 300000);

            const creatingMap = {};
            activeStacks.forEach(stack => {
                creatingMap[stack.name] = true;
            });
            setCreatingStacks(creatingMap);
        };

        checkCreatingStacks();
        const interval = setInterval(checkCreatingStacks, 5000);
        return () => clearInterval(interval);
    }, []);

    // Загружаем данные при монтировании
    useEffect(() => {
        fetchDashboardData();

        // Обновляем каждые 30 секунд (можно увеличить до 60)
        const interval = setInterval(() => {
            fetchDashboardData();
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    const checkStackHealth = async (stackId, stackName) => {
        if (!stackId) {
            setError('ID стека не найден');
            return;
        }
        try {
            await axios.post(`${API_URL}/sandboxes/${stackId}/check-health`);
            // Не перезагружаем всё, просто показываем уведомление
            setError('Проверка выполнена');
            setTimeout(() => setError(''), 3000);
        } catch (err) {
            setError('Ошибка проверки стека');
        }
    };

    const restartStack = async (stackId, stackName) => {
        if (!stackId) {
            setError('ID стека не найден');
            return;
        }
        try {
            await axios.post(`${API_URL}/sandboxes/${stackId}/restart`);
            // Ждем и обновляем данные
            setTimeout(() => fetchDashboardData(), 3000);
        } catch (err) {
            setError('Ошибка перезапуска стека');
        }
    };

    const deleteStack = async () => {
        if (!deleteDialog.stackName) {
            setError('Имя стека не найдено');
            return;
        }
        try {
            await axios.delete(`${API_URL}/stacks/${deleteDialog.stackName}`);
            setDeleteDialog({ open: false, stackId: null, stackName: '' });
            fetchDashboardData();
        } catch (err) {
            setError('Ошибка удаления стека');
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
            case 'running': return 'Работает';
            case 'partial': return 'Частично';
            case 'stopped': return 'Остановлен';
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
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
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
                <Alert severity={error.includes('выполнена') ? 'success' : 'error'}
                       sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {Object.keys(creatingStacks).length > 0 && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: '#e3f2fd' }}>
                    <Typography variant="subtitle1" gutterBottom>
                        🚀 Стеки в процессе создания: {Object.keys(creatingStacks).join(', ')}
                    </Typography>
                    <LinearProgress sx={{ mt: 1 }} />
                </Paper>
            )}

            {refreshing && <LinearProgress sx={{ mb: 2 }} />}

            <Grid container spacing={3}>
                {stacks.map((stack) => {
                    const status = getStackStatus(stack);
                    return (
                        <Grid item xs={12} key={stack.id || stack.name}>
                            <Card>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
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
                                            <Typography>Статистика доступности</Typography>
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
                                            Перезапустить
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
                        Нет созданных стеков
                    </Typography>
                    <Button variant="contained" color="primary" component="a" href="/create">
                        Создать новый стек
                    </Button>
                </Paper>
            )}
        </Box>
    );
}

export default ContainerList;