import React, { useEffect, useState, useContext } from 'react';
import { Container, Typography, Paper, List, ListItem, ListItemText, Chip, Box } from '@mui/material';
import axios from 'axios';
import BuildIcon from '@mui/icons-material/Build';
import { ApiContext } from '../App';

function History() {
    const [history, setHistory] = useState([]);
    const [jenkinsJobs, setJenkinsJobs] = useState([]);
    const API_URL = useContext(ApiContext);

    useEffect(() => {
        fetchHistory();
        fetchJenkinsJobs();
    }, []);

    const fetchHistory = async () => {
        try {
            const response = await axios.get(`${API_URL}/history`);
            const sortedHistory = (response.data || []).sort((a, b) =>
                new Date(b.created_at) - new Date(a.created_at)
            );
            setHistory(sortedHistory);
        } catch (err) {
            console.error('Error fetching history:', err);
        }
    };

    const fetchJenkinsJobs = async () => {
        try {
            const response = await axios.get(`${API_URL}/jenkins/jobs`);
            setJenkinsJobs(response.data.jobs || []);
        } catch (err) {
            console.error('Error fetching Jenkins jobs:', err);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>
                История действий
            </Typography>

            {/* История действий */}
            <Paper>
                <List>
                    {history.length === 0 ? (
                        <ListItem>
                            <ListItemText primary="История пуста" />
                        </ListItem>
                    ) : (
                        history.map(item => (
                            <ListItem key={item.id} divider>
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
                        ))
                    )}
                </List>
            </Paper>
        </Container>
    );
}

export default History;