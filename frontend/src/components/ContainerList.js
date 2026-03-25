import React, { useEffect, useState, useContext } from 'react';
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
    LinearProgress,
    IconButton,
    Tooltip,
    Switch,
    FormControlLabel
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import RefreshIcon from '@mui/icons-material/Refresh';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ScheduleIcon from '@mui/icons-material/Schedule';
import axios from 'axios';
import UptimeChart from './UptimeChart';
import { ApiContext } from '../App';

function ContainerList() {
    const [stacks, setStacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [loadingContainers, setLoadingContainers] = useState({});
    const [creatingStacks, setCreatingStacks] = useState({});
    const [refreshing, setRefreshing] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, stackId: null, stackName: '' });

    // Состояния для авто-проверки
    const [autoCheckEnabled, setAutoCheckEnabled] = useState(false);
    const [autoCheckStatus, setAutoCheckStatus] = useState({
        enabled: false,
        last_run: null,
        next_run: null
    });
    const [togglingAutoCheck, setTogglingAutoCheck] = useState(false);

    const API_URL = useContext(ApiContext);

    // Загрузка списка стеков
    const fetchStacks = async (showRefresh = false) => {
        if (showRefresh) setRefreshing(true);
        try {
            setLoading(true);

            let stacksFromAgent = [];
            try {
                const response = await axios.get(`${API_URL}/stacks`);
                if (response.data.success) {
                    stacksFromAgent = response.data.stacks || [];
                }
            } catch (err) {
                console.error('Error fetching stacks:', err);
            }

            let sandboxes = [];
            try {
                const sandboxesResponse = await axios.get(`${API_URL}/sandboxes`);
                sandboxes = sandboxesResponse.data.data || [];
            } catch (err) {
                console.error('Error fetching sandboxes:', err);
            }

            const stackIdMap = {};
            sandboxes.forEach(sandbox => {
                stackIdMap[sandbox.name] = sandbox.id;
            });

            const containersPromises = stacksFromAgent.map(async (stack) => {
                setLoadingContainers(prev => ({ ...prev, [stack.name]: true }));
                try {
                    const containersResponse = await axios.get(`${API_URL}/docker/stacks/${stack.name}/containers`);
                    return {
                        ...stack,
                        id: stackIdMap[stack.name] || null,
                        name: stack.name,
                        containers: containersResponse.data.containers || []
                    };
                } catch (err) {
                    return {
                        ...stack,
                        id: stackIdMap[stack.name] || null,
                        name: stack.name,
                        containers: []
                    };
                } finally {
                    setLoadingContainers(prev => ({ ...prev, [stack.name]: false }));
                }
            });

            const stacksWithContainers = await Promise.all(containersPromises);
            setStacks(stacksWithContainers);
            setError('');
        } catch (err) {
            console.error('Fetch stacks error:', err);
            setError('Ошибка подключения к серверу');
            setStacks([]);
        } finally {
            setLoading(false);
            if (showRefresh) setRefreshing(false);
        }
    };

    // Проверка доступности стека
    const checkStackHealth = async (stackId, stackName) => {
        if (!stackId) {
            setError('ID стека не найден');
            return;
        }
        try {
            const response = await axios.post(`${API_URL}/sandboxes/${stackId}/check-health`);
            fetchStacks();
        } catch (err) {
            setError('Ошибка проверки стека');
            console.error(err);
        }
    };

    // Перезапуск стека
    const restartStack = async (stackId, stackName) => {
        if (!stackId) {
            setError('ID стека не найден');
            return;
        }
        try {
            setLoadingContainers(prev => ({ ...prev, [stackName]: true }));
            await axios.post(`${API_URL}/sandboxes/${stackId}/restart`);
            alert(`Стек "${stackName}" перезапущен`);
            fetchStacks();
        } catch (err) {
            setError('Ошибка перезапуска стека');
            console.error(err);
        } finally {
            setLoadingContainers(prev => ({ ...prev, [stackName]: false }));
        }
    };

    // Удаление стека
    const deleteStack = async () => {
        if (!deleteDialog.stackName) {
            setError('Имя стека не найдено');
            return;
        }
        try {
            await axios.delete(`${API_URL}/stacks/${deleteDialog.stackName}`);
            setDeleteDialog({ open: false, stackId: null, stackName: '' });
            fetchStacks();
        } catch (err) {
            setError('Ошибка удаления стека');
            console.error(err);
        }
    };

    // Проверка статуса создаваемого стека
    const checkStackCreationStatus = async (stackName) => {
        try {
            const response = await axios.get(`${API_URL}/stacks`);
            if (response.data.success) {
                const stacks = response.data.stacks || [];
                const exists = stacks.some(s => s.name === stackName);

                if (exists) {
                    const creating = JSON.parse(localStorage.getItem('creatingStacks') || '[]');
                    const updated = creating.filter(s => s.name !== stackName);
                    localStorage.setItem('creatingStacks', JSON.stringify(updated));

                    setCreatingStacks(prev => {
                        const newState = { ...prev };
                        delete newState[stackName];
                        return newState;
                    });

                    fetchStacks();
                    return true;
                }
            }
            return false;
        } catch (err) {
            console.error('Error checking stack status:', err);
            return false;
        }
    };

    // Функция для переключения авто-проверки
    const toggleAutoCheck = async () => {
        setTogglingAutoCheck(true);
        try {
            const newState = !autoCheckEnabled;
            const endpoint = newState ? 'enable' : 'disable';
            await axios.post(`${API_URL}/auto-check/${endpoint}`);
            setAutoCheckEnabled(newState);
            fetchAutoCheckStatus();

            if (newState) {
                await axios.post(`${API_URL}/auto-check/run-now`);
            }
        } catch (err) {
            console.error('Error toggling auto-check:', err);
            alert('Ошибка при изменении настроек');
        } finally {
            setTogglingAutoCheck(false);
        }
    };

    // Функция для получения статуса авто-проверки
    const fetchAutoCheckStatus = async () => {
        try {
            const response = await axios.get(`${API_URL}/auto-check/status`);
            setAutoCheckStatus(response.data);
            setAutoCheckEnabled(response.data.enabled);
        } catch (err) {
            console.error('Error fetching auto-check status:', err);
        }
    };

    // Проверка создаваемых стеков из localStorage
    useEffect(() => {
        const checkCreatingStacks = () => {
            const creating = JSON.parse(localStorage.getItem('creatingStacks') || '[]');
            const now = Date.now();
            const activeStacks = creating.filter(stack => now - stack.timestamp < 300000);

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
        const interval = setInterval(checkCreatingStacks, 5000);
        return () => clearInterval(interval);
    }, []);

    // Периодическая проверка статуса создаваемых стеков
    useEffect(() => {
        const checkAllCreatingStacks = async () => {
            const creating = JSON.parse(localStorage.getItem('creatingStacks') || '[]');
            for (const stack of creating) {
                await checkStackCreationStatus(stack.name);
            }
        };

        const interval = setInterval(checkAllCreatingStacks, 30000);
        return () => clearInterval(interval);
    }, []);

    // Удаляем из creatingStacks стеки, которые уже появились
    useEffect(() => {
        if (stacks.length > 0) {
            const existingStackNames = new Set(stacks.map(s => s.name));
            const creating = JSON.parse(localStorage.getItem('creatingStacks') || '[]');
            const updated = creating.filter(stack => !existingStackNames.has(stack.name));

            if (updated.length !== creating.length) {
                localStorage.setItem('creatingStacks', JSON.stringify(updated));
                setCreatingStacks(prev => {
                    const newState = { ...prev };
                    existingStackNames.forEach(name => delete newState[name]);
                    return newState;
                });
            }
        }
    }, [stacks]);

    // Загрузка статуса авто-проверки при монтировании
    useEffect(() => {
        fetchAutoCheckStatus();
        const interval = setInterval(fetchAutoCheckStatus, 60000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        fetchStacks();
        const interval = setInterval(() => fetchStacks(), 20000);
        return () => clearInterval(interval);
    }, []);

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
        if (stack.containers.length === 0) return 'no_containers';
        const allRunning = stack.containers.every(c => c.state === 'running');
        if (allRunning) return 'running';
        const anyRunning = stack.containers.some(c => c.state === 'running');
        if (anyRunning) return 'partial';
        return 'stopped';
    };

    const handleManualRefresh = () => {
        fetchStacks(true);
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
                        Будут удалены все связанные контейнеры и данные из базы данных.
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
                <Box>
                    <Tooltip title={autoCheckEnabled ? "Автопроверка включена" : "Автопроверка отключена"}>
                        <IconButton
                            onClick={toggleAutoCheck}
                            disabled={togglingAutoCheck}
                            color={autoCheckEnabled ? "success" : "default"}
                            sx={{ mr: 1 }}
                        >
                            {autoCheckEnabled ? <PlayArrowIcon /> : <StopIcon />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Обновить список">
                        <IconButton onClick={handleManualRefresh} disabled={refreshing}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            {/* Блок статуса авто-проверки */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: autoCheckEnabled ? '#e8f5e9' : '#ffebee' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap">
                    <Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <ScheduleIcon color={autoCheckEnabled ? "success" : "disabled"} />
                            <Typography variant="subtitle1">
                                {autoCheckEnabled ? '✅ Автопроверка активна' : '⏸️ Автопроверка отключена'}
                            </Typography>
                        </Box>
                        {autoCheckStatus.last_run && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                Последняя проверка: {new Date(autoCheckStatus.last_run).toLocaleString()}
                            </Typography>
                        )}
                        {autoCheckStatus.next_run && autoCheckEnabled && (
                            <Typography variant="caption" color="text.secondary" display="block">
                                Следующая проверка: ~{new Date(autoCheckStatus.next_run).toLocaleTimeString()}
                            </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                            Автоматическая проверка выполняется каждые 30 минут и восстанавливает упавшие стеки
                        </Typography>
                    </Box>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={autoCheckEnabled}
                                onChange={toggleAutoCheck}
                                disabled={togglingAutoCheck}
                                color="success"
                            />
                        }
                        label={autoCheckEnabled ? "Включена" : "Выключена"}
                        sx={{ ml: 2 }}
                    />
                </Box>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Блок создаваемых стеков */}
            {Object.keys(creatingStacks).length > 0 && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: '#e3f2fd' }}>
                    <Typography variant="subtitle1" gutterBottom>
                        🚀 Стеки в процессе создания:
                    </Typography>
                    <Box display="flex" gap={2} flexWrap="wrap">
                        {Object.keys(creatingStacks).map(stackName => (
                            <Chip
                                key={stackName}
                                label={stackName}
                                color="info"
                                icon={<CircularProgress size={16} />}
                                onDelete={() => checkStackCreationStatus(stackName)}
                                deleteIcon={<RefreshIcon />}
                            />
                        ))}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        Стеки создаются в фоновом режиме (до 2-3 минут). Нажмите на крестик, чтобы проверить статус.
                    </Typography>
                    <LinearProgress sx={{ mt: 1 }} />
                </Paper>
            )}

            {refreshing && (
                <LinearProgress sx={{ mb: 2 }} />
            )}

            <Grid container spacing={3}>
                {stacks.map((stack) => {
                    const status = getStackStatus(stack);
                    return (
                        <Grid item xs={12} key={stack.id || stack.name}>
                            <Card style={{ width: "1000px" }}>
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
                                        {creatingStacks[stack.name] && (
                                            <Chip
                                                label="Создается..."
                                                size="small"
                                                color="info"
                                                icon={<CircularProgress size={16} />}
                                            />
                                        )}
                                    </Box>

                                    <Typography variant="h6" gutterBottom>
                                        {stack.name}
                                    </Typography>

                                    {stack.containers.map(container => (
                                        <Box key={container.id} sx={{ ml: 2, mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center">
                                                <Typography variant="body2">
                                                    <strong>{container.name.replace(`${stack.name}_`, '')}:</strong> {container.image}
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
                                            disabled={!stack.id || creatingStacks[stack.name]}
                                        >
                                            Проверить
                                        </Button>
                                        <Button
                                            size="small"
                                            color="primary"
                                            onClick={() => restartStack(stack.id, stack.name)}
                                            startIcon={<RestartAltIcon />}
                                            sx={{ mr: 1 }}
                                            disabled={!stack.id || creatingStacks[stack.name]}
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
                                            disabled={!stack.name || creatingStacks[stack.name]}
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
                    <Button
                        variant="contained"
                        color="primary"
                        component="a"
                        href="/create"
                    >
                        Создать новый стек
                    </Button>
                </Paper>
            )}
        </Box>
    );
}

export default ContainerList;