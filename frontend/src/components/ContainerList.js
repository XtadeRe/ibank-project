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
    AccordionDetails
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import axios from 'axios';
import UptimeChart from './UptimeChart';
import { ApiContext } from '../App';

function ContainerList() {
    const [stacks, setStacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteDialog, setDeleteDialog] = useState({ open: false, stackId: null, stackName: '' });

    // Получаем API URL из контекста
    const API_URL = useContext(ApiContext);

    // Загрузка списка стеков из БД и контейнеров из Docker
    const fetchStacks = async () => {
        try {
            setLoading(true);

            // 1. Получаем все стеки из БД
            const stacksResponse = await axios.get(`${API_URL}/sandboxes`);
            const stacksFromDb = stacksResponse.data.data || [];

            // 2. Получаем все контейнеры из Docker
            const containersResponse = await axios.get(`${API_URL}/docker/containers`);
            const allContainers = containersResponse.data.containers || [];

            // 3. Группируем контейнеры по стекам
            const stacksWithContainers = stacksFromDb.map(stack => {
                // Ищем контейнеры, которые принадлежат этому стеку
                const stackContainers = allContainers.filter(container =>
                    container.name.startsWith(stack.name + '_')
                );

                return {
                    ...stack,
                    containers: stackContainers,
                    // Определяем общий статус стека
                    overall_status: stackContainers.length > 0
                        ? (stackContainers.every(c => c.state === 'running') ? 'running' : 'partial')
                        : 'stopped'
                };
            });

            setStacks(stacksWithContainers);
            setError('');
        } catch (err) {
            setError('Ошибка загрузки данных');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Запуск стека
    const startStack = async (stackId) => {
        try {
            await axios.post(`${API_URL}/sandboxes/${stackId}/start`);
            fetchStacks();
        } catch (err) {
            setError('Ошибка запуска стека');
            console.error(err);
        }
    };

    // Проверка доступности стека
    const checkStackHealth = async (stackId) => {
        try {
            const response = await axios.post(`${API_URL}/sandboxes/${stackId}/check-health`);

            // Показываем уведомление о результате
            alert(response.data.message);

            // Обновляем данные, чтобы увидеть изменения в графике
            fetchStacks();
        } catch (err) {
            setError('Ошибка проверки стека');
            console.error(err);
        }
    };

    // Остановка стека
    const stopStack = async (stackId) => {
        try {
            await axios.post(`${API_URL}/sandboxes/${stackId}/stop`);
            fetchStacks();
        } catch (err) {
            setError('Ошибка остановки стека');
            console.error(err);
        }
    };

    // Перезапуск стека (перезапускаем все контейнеры стека)
    const restartStack = async (stackId) => {
        try {
            await axios.post(`${API_URL}/sandboxes/${stackId}/restart`);
            fetchStacks();
        } catch (err) {
            setError('Ошибка перезапуска стека');
            console.error(err);
        }
    };

    // Удаление стека
    const deleteStack = async () => {
        try {
            // Удаляем через Docker API
            await axios.post(`${API_URL}/docker/stacks/${deleteDialog.stackName}/delete`);

            // Удаляем из БД
            await axios.delete(`${API_URL}/sandboxes/${deleteDialog.stackId}`);

            setDeleteDialog({ open: false, stackId: null, stackName: '' });
            fetchStacks();
        } catch (err) {
            setError('Ошибка удаления стека');
            console.error(err);
        }
    };

    // Загружаем данные при монтировании
    useEffect(() => {
        fetchStacks();
        const interval = setInterval(fetchStacks, 10000);
        return () => clearInterval(interval);
    }, []);

    // Получить цвет статуса
    const getStatusColor = (status) => {
        switch(status) {
            case 'running': return 'success';
            case 'partial': return 'warning';
            case 'stopped': return 'default';
            case 'failed': return 'error';
            default: return 'default';
        }
    };

    // Статус
    const getStatusText = (status) => {
        switch(status) {
            case 'running': return 'Работает';
            case 'partial': return 'Частично';
            case 'stopped': return 'Остановлен';
            case 'failed': return 'Ошибка';
            default: return status;
        }
    };

    // Иконка обновления (загрузки стеков)
    if (loading && stacks.length === 0) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Диалог подтверждения удаления */}
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

            <Typography variant="h4" gutterBottom>
                Управление стеками
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Grid container spacing={3}>
                {stacks.map((stack) => (
                    <Grid item xs={12} key={stack.id}>
                        <Card>
                            <CardContent>
                                <Box display="flex" gap={1} mb={1}>
                                    <Chip
                                        label={stack.git_branch}
                                        size="small"
                                        color={stack.git_branch === 'master' ? 'primary' : 'secondary'}
                                        variant="outlined"
                                    />
                                    <Chip
                                        label={`v${stack.version}`}
                                        size="small"
                                        variant="outlined"
                                    />
                                </Box>
                                <Typography variant="h6" gutterBottom>
                                    {stack.name}
                                </Typography>

                                {stack.containers.map(container => (
                                    <Box key={container.id} sx={{ ml: 2, mb: 1, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                        <Box display="flex" justifyContent="space-between">
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
                                    <AccordionDetails>
                                        <UptimeChart stackId={stack.id} stackName={stack.name} />
                                    </AccordionDetails>
                                </Accordion>

                                {/* Кнопки управления */}
                                <Box display="flex" justifyContent="flex-end" mt={2}>
                                    <Button
                                        size="small"
                                        color="info"
                                        onClick={() => checkStackHealth(stack.id)}
                                        startIcon={<HealthAndSafetyIcon />}
                                        sx={{ mr: 1 }}
                                    >
                                        Проверить
                                    </Button>
                                    <Button
                                        size="small"
                                        color="primary"
                                        onClick={() => restartStack(stack.id)}
                                        startIcon={<RestartAltIcon />}
                                        sx={{ mr: 1 }}
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
                ))}
            </Grid>

            {stacks.length === 0 && !loading && (
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