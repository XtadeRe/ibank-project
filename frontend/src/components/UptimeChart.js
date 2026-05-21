import React, { useEffect, useState } from 'react';
import {
    Box, Card, CardContent, Typography, CircularProgress,
    Alert, Grid, Paper, Chip
} from '@mui/material';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, ReferenceLine, Label
} from 'recharts';
import axios from 'axios';
import { ApiContext } from '../App';

function UptimeChart({ stackId, stackName }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false); 
    const API_URL = React.useContext(ApiContext);

    const isMountedRef = React.useRef(true);
    useEffect(() => {
        isMountedRef.current = true;
        return () => { isMountedRef.current = false; };
    }, []);

    const fetchUptimeData = React.useCallback(async (isInitialLoad = false) => {
        if (!isMountedRef.current) return;

        const identifier = stackId || stackName;
        if (!identifier) {
            setError('ID стека не указан.');
            setData(null);
            return;
        }

        if (isMountedRef.current) {
            if (isInitialLoad) {
                setLoading(true);
            } else {
                setIsRefreshing(true); 
            }
        }

        try {
            const response = await axios.get(`${API_URL}/sandboxes/${identifier}/uptime`, {
                headers: {
                    'Cache-Control': 'no-cache'
                },
                timeout: 20000
            });

            if (isMountedRef.current) {
                setData(response.data);
                setError('');
            }
        } catch (err) {
            if (axios.isCancel(err)) {
                console.log('Request canceled:', err.message);
                return;
            }

            console.error('Uptime fetch error:', err);
            if (isMountedRef.current && isInitialLoad) {
                let errorMsg = 'Ошибка загрузки статистики';
                if (err.response?.status === 404) {
                    errorMsg = 'Статистика временно недоступна';
                } else if (err.message) {
                    errorMsg += `: ${err.message}`;
                }
                setError(errorMsg);
                setData(null);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
                setIsRefreshing(false);
            }
        }
    }, [API_URL, stackId, stackName, isMountedRef]);

    useEffect(() => {
        if (!stackId) {
            setError('Статистика недоступна для этого стека.');
            setData(null);
            setLoading(false);
            return;
        }

        setError('');

        fetchUptimeData(true);

        const interval = setInterval(() => fetchUptimeData(false), 30000);

        const timeInterval = setInterval(() => {
            if (isMountedRef.current) {
                setCurrentTime(new Date());
            }
        }, 1000);

        return () => {
            clearInterval(interval);
            clearInterval(timeInterval);
        };
    }, [stackId, fetchUptimeData]);


    if (!stackId) {
        return (
            <Alert severity="info" sx={{ mt: 2 }}>
                Статистика доступности недоступна для этого стека.
            </Alert>
        );
    }

    // Показываем полный загрузчик только при первой загрузке
    if (loading && !data) {
        return (
            <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !data || !Array.isArray(data.chart) || typeof data.uptime !== 'object') {
        return (
            <Alert severity="info" sx={{ mt: 2 }}>
                {error || 'Статистика доступности накапливается...'}
            </Alert>
        );
    }

    const getUptimeColor = (value) => {
        if (value >= 99.9) return '#4caf50';
        if (value >= 70) return '#8bc34a';
        if (value >= 50) return '#ffc107';
        return '#f44336';
    };

    const currentHourIndex = data.chart?.findIndex(item => item.isCurrentHour) || -1;

    return (
        <Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
                {['day', 'week', 'month'].map((period) => (
                    data.uptime && data.uptime[period] !== undefined && (
                        <Grid item xs={4} key={period}>
                            <Paper
                                sx={{
                                    p: 2,
                                    textAlign: 'center',
                                    bgcolor: getUptimeColor(data.uptime[period]) + '15',
                                    borderLeft: `4px solid ${getUptimeColor(data.uptime[period])}`
                                }}
                            >
                                <Typography variant="h4" color={getUptimeColor(data.uptime[period])}>
                                    {data.uptime[period]}%
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {period === 'day' ? 'За 24 часа' : period === 'week' ? 'За 7 дней' : 'За 30 дней'}
                                </Typography>
                            </Paper>
                        </Grid>
                    )
                ))}
            </Grid>

            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                            Доступность за 24 часа
                        </Typography>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                                label={`Сейчас: ${currentTime.toLocaleTimeString()}`}
                                size="small"
                                color="primary"
                            />
                        </Box>
                    </Box>

                    {data.chart && data.chart.length > 0 ? (
                        <Box sx={{ width: '100%', height: 350, minWidth: '550px', opacity: isRefreshing ? 0.8 : 1, transition: 'opacity 0.3s' }}>
                            <ResponsiveContainer>
                                <LineChart
                                    data={data.chart}
                                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis
                                        dataKey="hour"
                                        interval={3}
                                    />
                                    <YAxis
                                        domain={[0, 100]}
                                        unit="%"
                                        tickFormatter={(value) => `${value}`}
                                    />
                                    <Tooltip
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const dataPayload = payload[0].payload;
                                                if(!dataPayload) return null;
                                                return (
                                                    <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                                                        <Typography variant="body2" color="textSecondary">
                                                            Час: {label}
                                                        </Typography>
                                                        <Typography variant="body1" color="primary">
                                                            Доступность: {dataPayload.uptime}%
                                                        </Typography>
                                                        <Typography variant="body2" color="textSecondary">
                                                            Проверок: {dataPayload.checks}
                                                        </Typography>
                                                        <Typography variant="body2" color="success.main">
                                                            Успешно: {dataPayload.available}
                                                        </Typography>
                                                        <Typography variant="body2" color="error.main">
                                                            Ошибок: {dataPayload.failed}
                                                        </Typography>
                                                    </Paper>
                                                );
                                            }
                                            return null;
                                        }}
                                    />

                                    {currentHourIndex !== -1 && data.chart[currentHourIndex] && (
                                        <ReferenceLine
                                            x={data.chart[currentHourIndex].hour}
                                            stroke="#ff6b6b"
                                            strokeWidth={2}
                                            strokeDasharray="3 3"
                                        >
                                            <Label
                                                value="Сейчас"
                                                position="top"
                                                fill="#ff6b6b"
                                                fontSize={12}
                                            />
                                        </ReferenceLine>
                                    )}

                                    <Line
                                        type="monotone"
                                        dataKey="uptime"
                                        name="Доступность %"
                                        stroke="#8884d8"
                                        strokeWidth={3}
                                        dot={(props) => {
                                            const { cx, cy, payload } = props;
                                            if (!payload || payload.checks === 0) {
                                                return null;
                                            }
                                            return (
                                                <circle
                                                    cx={cx}
                                                    cy={cy}
                                                    r={4}
                                                    fill="#8884d8"
                                                    stroke="none"
                                                />
                                            );
                                        }}
                                        activeDot={{ r: 8 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </Box>
                    ) : (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            Недостаточно данных для отображения графика.
                        </Alert>
                    )}

                    <Box display="flex" justifyContent="center" gap={4} mt={2}>
                        <Box display="flex" alignItems="center">
                            <Box sx={{ width: 20, height: 3, bgcolor: '#8884d8', mr: 1 }} />
                            <Typography variant="caption">Доступность</Typography>
                        </Box>
                        <Box display="flex" alignItems="center">
                            <Box sx={{ width: 20, height: 3, bgcolor: '#ff6b6b', mr: 1 }} />
                            <Typography variant="caption">Текущий час</Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}

export default UptimeChart;