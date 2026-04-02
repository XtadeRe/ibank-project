import React, { useState, useContext, useEffect } from 'react';
import {
    Container, Typography, Paper, TextField, Button,
    FormControl, InputLabel, Select, MenuItem,
    CircularProgress, Alert, Box, Link
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { ApiContext } from '../App';

function CreateStack() {
    const navigate = useNavigate();
    const API_URL = useContext(ApiContext);

    const [form, setForm] = useState({
        name: '',
        git_branch: '',
        stack_type: 'full'
    });

    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const response = await axios.get(`${API_URL}/branch-data`);
                setBranches(response.data.data || []);
            } catch (err) {
                console.error('Ошибка загрузки веток:', err);
                const fallbackBranches = ['develop', 'master'];
                setBranches(fallbackBranches);
            } finally {
                setLoadingBranches(false);
            }
        };

        fetchBranches();
    }, []);

    const isNameValid = (name) => {
        return /^[a-z0-9-]{3,30}$/.test(name);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!form.name) {
            setError('Введите имя стека');
            return;
        }
        if (!isNameValid(form.name)) {
            setError('Имя: только латиница, цифры, дефис. 3-30 символов');
            return;
        }
        if (!form.git_branch) {
            setError('Выберите ветку');
            return;
        }

        try {
            setSubmitting(true);
            setError('');
            setSuccess('');

            const creating = JSON.parse(localStorage.getItem('creatingStacks') || '[]');
            creating.push({
                name: form.name,
                timestamp: Date.now(),
                type: form.stack_type,
                branch: form.git_branch
            });
            localStorage.setItem('creatingStacks', JSON.stringify(creating));

            await axios.post(`${API_URL}/jenkins/deploy`, {
                branch: form.git_branch,
                stack_type: form.stack_type,
                stack_name: form.name,
                machine_ip: '127.0.0.1'
            });

            setSuccess(`Стек "${form.name}" успешно создан!`);

            setForm({
                name: '',
                git_branch: branches[0] || 'develop',
                stack_type: 'full'
            });

            setTimeout(() => navigate('/'), 3000);

        } catch (err) {
            setError(err.response?.data?.error || 'Ошибка создания стека');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <BuildIcon color="primary" fontSize="large" />
                    <Typography variant="h4">Создание стека</Typography>
                </Box>

                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Создание занимает 1-3 минуты. После создания вы вернетесь на главную.
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />} onClose={() => setSuccess('')}>
                        {success}
                        <Box sx={{ mt: 1 }}>
                            <Link href="/">Перейти к списку →</Link>
                        </Box>
                    </Alert>
                )}

                <TextField
                    fullWidth
                    label="Имя стека"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    margin="normal"
                    disabled={submitting}
                    error={form.name && !isNameValid(form.name)}
                    helperText={form.name && !isNameValid(form.name) ? "Латиница, цифры, дефис. 3-30 символов" : "Пример: my-app, test-stack"}
                />

                <FormControl fullWidth margin="normal" required disabled={loadingBranches}>
                    <InputLabel id="branch-select-label">
                        {loadingBranches ? 'Загрузка веток...' : 'Ветка Git'}
                    </InputLabel>
                    <Select
                        labelId="branch-select-label"
                        name="git_branch"
                        value={form.git_branch || ''}
                        onChange={handleChange}
                        label={loadingBranches ? 'Загрузка веток...' : 'Ветка Git'}
                    >
                        {branches.map(branch => (
                            <MenuItem key={branch} value={branch}>
                                {branch}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <FormControl fullWidth margin="normal">
                    <InputLabel>Тип стека</InputLabel>
                    <Select
                        name="stack_type"
                        value={form.stack_type}
                        onChange={handleChange}
                        label="Тип стека"
                        disabled={submitting}
                    >
                        <MenuItem value="full">Интернет банк (Full)</MenuItem>
                        <MenuItem value="api">Backend сервер (API + DB)</MenuItem>
                        <MenuItem value="db">База данных (MySQL)</MenuItem>
                    </Select>
                </FormControl>

                <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleSubmit}
                    disabled={submitting || loadingBranches || !form.name || !form.git_branch || !isNameValid(form.name)}
                    startIcon={!submitting && <BuildIcon />}
                    sx={{ mt: 4 }}
                >
                    {submitting ? <CircularProgress size={24} /> : 'Создать стек'}
                </Button>
            </Paper>
        </Container>
    );
}

export default CreateStack;