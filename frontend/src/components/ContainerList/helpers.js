export const getStatusColor = (status) => {
    switch (status) {
        case 'running': return 'success';
        case 'partial': return 'warning';
        case 'stopped': return 'default';
        case 'failed': return 'error';
        default: return 'default';
    }
};

export const getStatusText = (status) => {
    switch (status) {
        case 'running': return 'Запущен';
        case 'partial': return 'Частично';
        case 'stopped': return 'Остановлен';
        case 'created': return 'Ожидает запуска';
        case 'exited': return 'Остановлен';
        case 'paused': return 'Пауза';
        case 'failed': return 'Ошибка';
        default: return status;
    }
};

export const getStackStatus = (stack, creatingStacks) => {
    if (creatingStacks[stack.name]) return 'creating';
    if (!stack.containers || stack.containers.length === 0) return 'no_containers';

    const allRunning = stack.containers.every(c => c.state === 'running');
    if (allRunning) return 'running';

    const anyRunning = stack.containers.some(c => c.state === 'running');
    if (anyRunning) return 'partial';

    return 'stopped';
};

