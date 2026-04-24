import React, { memo } from 'react';
import {
    Box,
    Button,
    CircularProgress,
    Alert,
    Paper,
    Typography,
    Grid,
    IconButton,
    Tooltip,
    LinearProgress,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useContainerList } from './useContainerList';
import DeleteDialog from './DeleteDialog';
import HealthCheckDialog from './HealthCheckDialog';
import StackCard from './StackCard';

function ContainerList() {
    const {
        stacks,
        loading,
        error,
        setError,
        creatingStacks,
        refreshing,
        deleteDialog,
        setDeleteDialog,
        lastUpdate,
        checkDialog,
        checkStackHealth,
        closeCheckDialog,
        restartStack,
        deleteStack,
        handleManualRefresh,
    } = useContainerList();

    const handleDeleteOpen = (stackId, stackName) => {
        setDeleteDialog({ open: true, stackId, stackName });
    };

    const handleDeleteClose = () => {
        setDeleteDialog({ open: false, stackId: null, stackName: '' });
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
            <DeleteDialog
                open={deleteDialog.open}
                stackName={deleteDialog.stackName}
                onClose={handleDeleteClose}
                onConfirm={deleteStack}
            />

            <HealthCheckDialog
                open={checkDialog.open}
                stackName={checkDialog.stackName}
                loading={checkDialog.loading}
                result={checkDialog.result}
                onClose={closeCheckDialog}
            />

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
                {stacks.map((stack) => (
                    <Grid width="100%" key={stack.id || stack.name}>
                        <StackCard
                            stack={stack}
                            creatingStacks={creatingStacks}
                            onCheck={checkStackHealth}
                            onRestart={restartStack}
                            onDelete={handleDeleteOpen}
                        />
                    </Grid>
                ))}
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

