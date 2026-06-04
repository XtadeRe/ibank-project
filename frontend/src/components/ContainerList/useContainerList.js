import { useEffect, useState, useContext, useCallback, useTransition } from 'react';
import axios from 'axios';
import { ApiContext } from '../../App';

export function useContainerList() {
    const [stacks, setStacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [creatingStacks, setCreatingStacks] = useState({});
    const [refreshing, setRefreshing] = useState(false);
    const [deleteDialog, setDeleteDialog] = useState({ open: false, stackId: null, stackName: '' });
    const [lastUpdate, setLastUpdate] = useState(null);
    const [isPending, startTransition] = useTransition();
    const [checkDialog, setCheckDialog] = useState({
        open: false,
        stackId: null,
        stackName: '',
        result: null,
        loading: false
    });

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
                        timeout: 45000
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
        }, 30000);

        return () => clearInterval(interval);
    }, [fetchDashboardData]);

    const checkStackHealth = useCallback(async (stackId, stackName) => {
        if (!stackId) {
            setError('ID стека не найден');
            return;
        }

        setCheckDialog({
            open: true,
            stackId,
            stackName,
            result: null,
            loading: true
        });

        try {
            const response = await axios.post(`${API_URL}/sandboxes/${stackId}/check-health`);

            setCheckDialog(prev => ({
                ...prev,
                result: response.data,
                loading: false
            }));
        } catch (err) {
            console.error('Health check error:', err);
            setCheckDialog(prev => ({
                ...prev,
                result: {
                    success: false,
                    message: err.response?.data?.message || err.message || 'Ошибка проверки стека',
                    error: err.response?.data?.error || err.message
                },
                loading: false
            }));
        }
    }, [API_URL]);

    const closeCheckDialog = useCallback(() => {
        setCheckDialog({
            open: false,
            stackId: null,
            stackName: '',
            result: null,
            loading: false
        });
    }, []);

    const restartStack = useCallback(async (stackId, stackName) => {
        if (!stackId) {
            setError('ID стека не найден');
            return;
        }
        try {
            setStacks(prev => prev.map(s =>
                s.id === stackId ? { ...s, status: 'restarting' } : s
            ));
            await axios.post(`${API_URL}/sandboxes/${stackId}/restart`);
            startTransition(() => fetchDashboardData(true));
        } catch (err) {
            setError('Ошибка перезапуска стека');
            startTransition(() => fetchDashboardData(true));
        }
    }, [API_URL, fetchDashboardData, startTransition]);

    const deleteStack = useCallback(async () => {
        if (!deleteDialog.stackName) {
            setError('Имя стека не найдено');
            return;
        }
        try {
            const removedName = deleteDialog.stackName;
            setStacks(prev => prev.filter(s => s.name !== removedName));
            setDeleteDialog({ open: false, stackId: null, stackName: '' });
            await axios.post(`${API_URL}/docker/stacks/${deleteDialog.stackName}/delete`);
            startTransition(() => fetchDashboardData(true));
        } catch (err) {
            setError('Ошибка удаления стека');
            startTransition(() => fetchDashboardData(true));
        }
    }, [API_URL, deleteDialog.stackName, fetchDashboardData, startTransition]);

    const handleManualRefresh = useCallback(() => {
        startTransition(() => fetchDashboardData(true));
    }, [fetchDashboardData, startTransition]);

    return {
        stacks,
        loading,
        error,
        setError,
        creatingStacks,
        refreshing,
        deleteDialog,
        setDeleteDialog,
        lastUpdate,
        isPending,
        checkDialog,
        checkStackHealth,
        closeCheckDialog,
        restartStack,
        deleteStack,
        handleManualRefresh,
    };
}

