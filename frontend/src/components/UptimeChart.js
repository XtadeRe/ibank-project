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
    const API_URL = React.useContext(ApiContext);

    useEffect(() => {
        if (!stackId && !stackName) {
            setError('Нет данных о стеке');
            setLoading(false);
            return;
        }
        fetchUptimeData();
        const interval = setInterval(fetchUptimeData, 60000);
        const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

        return () => {
            clearInterval(interval);
            clearInterval(timeInterval);
        };
    }, [stackId, stackName]);

    const fetchUptimeData = async () => {
        try {
            const identifier = stackId || stackName;
            // Добавляем кэширование на 30 секунд
            const response = await axios.get(`${API_URL}/sandboxes/${identifier}/uptime`, {
                headers: {
                    'Cache-Control': 'max-age=30'
                }
            });
            setData(response.data);
            setError('');
        } catch (err) {
            console.error('Uptime fetch error:', err);
            if (err.response?.status === 404) {
                setData(null);
                setError('Статистика временно недоступна');
            } else {
                setError('Ошибка загрузки статистики');
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
            </Box>
        );
    }

    if (error || !data || !data.chart) {
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
                ))}
            </Grid>

            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">
                            Доступность за 24 часа
                        </Typography>
                        <Chip
                            label={`Сейчас: ${currentTime.toLocaleTimeString()}`}
                            size="small"
                            color="primary"
                        />
                    </Box>

                    <Box sx={{ width: '100%', height: 350, minWidth: '550px' }}>
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
                                    tickFormatter={(value) => `${value}%`}
                                />
                                <Tooltip
                                    content={({ active, payload, label }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
                                                    <Typography variant="body2" color="textSecondary">
                                                        Час: {label}
                                                    </Typography>
                                                    <Typography variant="body1" color="primary">
                                                        Доступность: {data.uptime}%
                                                    </Typography>
                                                    <Typography variant="body2" color="textSecondary">
                                                        Проверок: {data.checks}
                                                    </Typography>
                                                    <Typography variant="body2" color="success.main">
                                                        ✅ Успешно: {data.available}
                                                    </Typography>
                                                    <Typography variant="body2" color="error.main">
                                                        ❌ Ошибок: {data.failed}
                                                    </Typography>
                                                </Paper>
                                            );
                                        }
                                        return null;
                                    }}
                                />

                                {currentHourIndex !== -1 && (
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
                                    dot={{ r: 4, fill: '#8884d8' }}
                                    activeDot={{ r: 8 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>

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