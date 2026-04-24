import React, { Suspense } from 'react';
import {
    Box,
    Card,
    CardContent,
    Chip,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Button,
    CircularProgress,
} from '@mui/material';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import { getStatusColor, getStatusText, getStackStatus } from './helpers';

const LazyUptimeChart = React.lazy(() => import('../UptimeChart'));

export default function StackCard({ stack, creatingStacks, onCheck, onRestart, onDelete }) {
    const status = getStackStatus(stack, creatingStacks);

    return (
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
                        <Suspense fallback={
                            <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <CircularProgress size={40} />
                            </Box>
                        }>
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
                        onClick={() => onCheck(stack.id, stack.name)}
                        startIcon={<HealthAndSafetyIcon />}
                        sx={{ mr: 1 }}
                        disabled={!stack.id}
                    >
                        Проверить
                    </Button>
                    <Button
                        size="small"
                        color="primary"
                        onClick={() => onRestart(stack.id, stack.name)}
                        startIcon={<RestartAltIcon />}
                        sx={{ mr: 1 }}
                        disabled={!stack.id}
                    >
                        Перезапуск
                    </Button>
                    <Button
                        size="small"
                        color="error"
                        onClick={() => onDelete(stack.id, stack.name)}
                        startIcon={<DeleteOutlined />}
                    >
                        Удалить
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
}

