import React, { useEffect, useState, useContext, useCallback, memo, useTransition } from 'react';
import { Container, Typography, Paper, List, ListItem, ListItemText, Chip, Box, Button, LinearProgress } from '@mui/material';
import axios from 'axios';
import { ApiContext } from '../App';

function History() {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [error, setError] = useState(null);
    const [isPending, startTransition] = useTransition();
    const API_URL = useContext(ApiContext);

    const fetchHistory = useCallback(async (page = 1, append = false) => {
        if (page === 1) {
            setLoading(true);
            setError(null);
        }

        try {
            const response = await axios.get(`${API_URL}/history?page=${page}&per_page=5`);

            const { data: newHistory, last_page, current_page } = response.data;

            if (append) {
                setHistory(prevHistory => [...prevHistory, ...newHistory]);
            } else {
                setHistory(newHistory);
            }

            setHasMore(current_page < last_page);

        } catch (err) {
            console.error('Error fetching history:', err);
            setError(err.message || 'Ошибка загрузки истории');
        } finally {
            if (page === 1) {
                setLoading(false);
            }
        }
    }, [API_URL]);

    useEffect(() => {
        fetchHistory(1, false);
    }, [fetchHistory]);

    const loadMore = useCallback(() => {
        const nextPage = currentPage + 1;
        startTransition(() => {
            fetchHistory(nextPage, true);
            setCurrentPage(nextPage);
        });
    }, [currentPage, fetchHistory, startTransition]);

    const HistoryItem = memo(({ item }) => (
        <ListItem key={item.id || `${item.sandbox_id}-${item.action}-${item.created_at}`} divider>
            <ListItemText
                primary={item.description || item.message}
                secondary={new Date(item.created_at).toLocaleString('ru-RU', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                })}
            />
            {item.action?.includes('jenkins') && (
                <Chip
                    size="small"
                    label="Jenkins"
                    color="secondary"
                />
            )}
        </ListItem>
    ));

    if (loading && history.length === 0) {
        return (
            <Container maxWidth="lg" sx={{ mt: 4 }}>
                <Typography variant="h4" gutterBottom>
                    История действий
                </Typography>
                <LinearProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>
                История действий
            </Typography>

            {error && <Typography color="error">Ошибка: {error}</Typography>}

            <Paper>
                <List>
                    {history.length === 0 ? (
                        <ListItem>
                            <ListItemText primary={loading ? 'Загрузка...' : 'История пуста'} />
                        </ListItem>
                    ) : (
                        history.map(item => <HistoryItem key={item.id || `${item.sandbox_id}-${item.action}-${item.created_at}`} item={item} />)
                    )}
                </List>

                {hasMore && (
                    <Box display="flex" justifyContent="center" p={2}>
                        <Button onClick={loadMore} variant="outlined" disabled={isPending}>
                            {isPending ? 'Загрузка...' : 'Загрузить еще'}
                        </Button>
                    </Box>
                )}

                {!hasMore && history.length > 0 && (
                    <Box display="flex" justifyContent="center" p={1}>
                        <Typography variant="caption" color="textSecondary">
                            Больше записей нет
                        </Typography>
                    </Box>
                )}
            </Paper>
        </Container>
    );
}

export default memo(History);
