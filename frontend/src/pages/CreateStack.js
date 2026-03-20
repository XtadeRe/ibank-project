import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Paper, TextField, Button,
    FormControl, InputLabel, Select, MenuItem,
    CircularProgress, Alert, Box
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BuildIcon from '@mui/icons-material/Build';

function CreateStack() {
    const navigate = useNavigate();

    // Состояния для формы
    const [formData, setFormData] = useState({
        name: '',
        git_branch: '',
        stack_type: '',
        machine_ip: '127.0.0.1'
    });

    // Состояния для веток
    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(true);
    const [branchesError, setBranchesError] = useState('');

    // Состояния для отправки
    const [submitting, setSubmitting] = useState(false);
    const [jenkinsSubmitting, setJenkinsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [jenkinsMessage, setJenkinsMessage] = useState('');

    // Загрузка веток при монтировании
    useEffect(() => {
        fetchBranches();
    }, []);

    // Получение списка веток
    const fetchBranches = async () => {
        try {
            setLoadingBranches(true);
            const response = await axios.get('http://localhost:8000/api/git-branches');
            setBranches(response.data.branches || []);
            setBranchesError('');
        } catch (err) {
            setBranchesError('Ошибка загрузки веток');
            console.error(err);
        } finally {
            setLoadingBranches(false);
        }
    };

    // Обработка изменения полей
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Отправка формы (обычное создание)
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.git_branch) {
            setSubmitError('Заполните все обязательные поля');
            return;
        }

        try {
            setSubmitting(true);
            setSubmitError('');
            setJenkinsMessage('');

            await axios.post('http://localhost:8000/api/sandboxes', formData);
            navigate('/');
        } catch (err) {
            setSubmitError(err.response?.data?.message || 'Ошибка создания стека');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    // Запуск сборки в Jenkins
    // Запуск сборки в Jenkins (асинхронно)
    const handleJenkinsDeploy = async () => {
        if (!formData.git_branch) {
            setSubmitError('Выберите ветку Git');
            return;
        }

        if (!formData.name) {
            setSubmitError('Введите имя стека');
            return;
        }

        try {
            setJenkinsSubmitting(true);
            setJenkinsMessage('');
            setSubmitError('');

            const response = await axios.post('http://localhost:8000/api/jenkins/deploy', {
                branch: formData.git_branch,
                stack_type: formData.stack_type || 'full',
                stack_name: formData.name,
                machine_ip: formData.machine_ip
            }, {
                timeout: 5000
            });

            setJenkinsMessage(`Сборка #${response.data.build_number} запущена в Jenkins`);

            setTimeout(() => {
                setFormData({
                    name: '',
                    git_branch: '',
                    stack_type: '',
                    machine_ip: '127.0.0.1'
                });
                setJenkinsMessage('');
            }, 3000);

        } catch (err) {
            // Если ошибка, показываем сообщение
            setSubmitError(err.response?.data?.error || 'Ошибка запуска сборки');
            console.error(err);
        } finally {
            setJenkinsSubmitting(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Создание нового стека
                </Typography>

                {submitError && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {submitError}
                    </Alert>
                )}

                {jenkinsMessage && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        {jenkinsMessage}
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Имя стека"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        margin="normal"
                        variant="outlined"
                        required
                        disabled={submitting || jenkinsSubmitting}
                    />

                    <FormControl fullWidth margin="normal" required>
                        <InputLabel>Ветка Git</InputLabel>
                        <Select
                            name="git_branch"
                            value={formData.git_branch}
                            onChange={handleChange}
                            label="Ветка Git"
                            disabled={loadingBranches || submitting || jenkinsSubmitting}
                        >
                            <MenuItem value="">
                                <em>Выберите ветку</em>
                            </MenuItem>
                            {loadingBranches ? (
                                <MenuItem disabled>
                                    <CircularProgress size={20} /> Загрузка...
                                </MenuItem>
                            ) : branchesError ? (
                                <MenuItem disabled>
                                    Ошибка загрузки
                                </MenuItem>
                            ) : (
                                branches.map((branch) => (
                                    <MenuItem key={branch} value={branch}>
                                        {branch}
                                    </MenuItem>
                                ))
                            )}
                        </Select>
                        {branchesError && (
                            <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                                {branchesError}
                            </Typography>
                        )}
                    </FormControl>

                    <FormControl fullWidth margin="normal">
                        <InputLabel>Тип стека</InputLabel>
                        <Select
                            name="stack_type"
                            value={formData.stack_type}
                            onChange={handleChange}
                            label="Тип стека"
                            disabled={submitting || jenkinsSubmitting}
                        >
                            <MenuItem value="full">Интернет банк</MenuItem>
                            <MenuItem value="api">API</MenuItem>
                            <MenuItem value="mysql">База данных</MenuItem>
                        </Select>
                    </FormControl>

                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Button
                            variant="outlined"
                            color="secondary"
                            size="large"
                            onClick={handleJenkinsDeploy}
                            disabled={jenkinsSubmitting || !formData.git_branch}
                            startIcon={<BuildIcon />}
                            sx={{ flex: 1 }}
                        >
                            {jenkinsSubmitting ? <CircularProgress size={24} /> : 'Создать стек'}
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Container>
    );
}

export default CreateStack;