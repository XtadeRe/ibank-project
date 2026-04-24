import React from 'react';
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    Alert,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Paper,
    Typography,
} from '@mui/material';
import { getStatusColor, getStatusText } from './helpers';

export default function HealthCheckDialog({ open, stackName, loading, result, onClose }) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
        >
            <DialogTitle>
                Результат проверки стека "{stackName}"
            </DialogTitle>
            <DialogContent>
                {loading ? (
                    <Box display="flex" flexDirection="column" alignItems="center" py={3}>
                        <CircularProgress />
                        <Typography sx={{ mt: 2 }}>Выполняется проверка состояния...</Typography>
                    </Box>
                ) : result && (
                    <Box>
                        <Alert
                            severity={result.success ? 'success' : 'error'}
                            sx={{ mb: 2 }}
                        >
                            {result.message || (result.success ? 'Проверка завершена успешно' : 'Обнаружены проблемы')}
                        </Alert>

                        {result.containers && result.containers.length > 0 && (
                            <>
                                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                                    Состояние контейнеров:
                                </Typography>
                                {result.containers.map((container, idx) => (
                                    <Paper key={idx} sx={{ p: 2, mb: 1, bgcolor: '#f5f5f5' }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="body2">
                                                    <strong>{container.name}</strong>
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {container.image}
                                                </Typography>
                                            </Box>
                                            <Chip
                                                label={getStatusText(container.state)}
                                                color={getStatusColor(container.state)}
                                                size="small"
                                            />
                                        </Box>
                                        {container.error && (
                                            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                                                Ошибка: {container.error}
                                            </Typography>
                                        )}
                                    </Paper>
                                ))}
                            </>
                        )}

                        {result.health_status && (
                            <>
                                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                                    Healthcheck статус:
                                </Typography>
                                <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                    <Typography variant="body2">
                                        Статус: <strong>{result.health_status}</strong>
                                    </Typography>
                                </Paper>
                            </>
                        )}

                        {result.details && (
                            <>
                                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2 }}>
                                    Детали:
                                </Typography>
                                <Paper sx={{ p: 2, bgcolor: '#f5f5f5' }}>
                                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {typeof result.details === 'object'
                                            ? JSON.stringify(result.details, null, 2)
                                            : result.details}
                                    </pre>
                                </Paper>
                            </>
                        )}

                        {result.error && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                <Typography variant="subtitle2">Детали ошибки:</Typography>
                                <Typography variant="body2">{result.error}</Typography>
                            </Alert>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained">
                    Закрыть
                </Button>
            </DialogActions>
        </Dialog>
    );
}

