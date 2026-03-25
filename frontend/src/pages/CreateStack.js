import React, { useState, useEffect, useContext } from 'react';
import {
    Container, Typography, Paper, TextField, Button,
    FormControl, InputLabel, Select, MenuItem,
    CircularProgress, Alert, Box
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BuildIcon from '@mui/icons-material/Build';
import { ApiContext } from '../App';

function CreateStack() {
    const navigate = useNavigate();
    const API_URL = useContext(ApiContext);

    // Состояния для формы
    const [formData, setFormData] = useState({
        name: '',
        git_branch: '',
        stack_type: 'full',
        machine_ip: '127.0.0.1'
    });

    // Состояния для веток
    const [branches, setBranches] = useState([]);
    const [loadingBranches, setLoadingBranches] = useState(true);
    const [branchesError, setBranchesError] = useState('');

    // Состояния для отправки
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Загрузка веток при монтировании
    useEffect(() => {
        fetchBranches();
    }, []);

    // Получение списка веток
    const fetchBranches = async () => {
        try {
            setLoadingBranches(true);
            const response = await axios.get(`${API_URL}/git-branches`);
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

    // Создание стека через Jenkins
    // Создание стека через Jenkins
    const handleCreateStack = async () => {
        if (!formData.name) {
            setSubmitError('Введите имя стека');
            return;
        }

        if (!formData.git_branch) {
            setSubmitError('Выберите ветку Git');
            return;
        }

        try {
            setSubmitting(true);
            setSubmitError('');
            setSuccessMessage('');

            // Сохраняем имя создаваемого стека в localStorage
            const creatingStacks = JSON.parse(localStorage.getItem('creatingStacks') || '[]');
            creatingStacks.push({
                name: formData.name,
                timestamp: Date.now(),
                type: formData.stack_type
            });
            localStorage.setItem('creatingStacks', JSON.stringify(creatingStacks));

            // Отправляем запрос в Jenkins
            const response = await axios.post(`${API_URL}/jenkins/deploy`, {
                branch: formData.git_branch,
                stack_type: formData.stack_type,
                stack_name: formData.name,
                machine_ip: formData.machine_ip
            });

            setSuccessMessage(`Стек "${formData.name}" успешно создан! Сборка #${response.data.build_number} запущена.`);

            // Очищаем форму
            setFormData({
                name: '',
                git_branch: '',
                stack_type: 'full',
                machine_ip: '127.0.0.1'
            });

            // Через 3 секунды переходим на главную
            setTimeout(() => {
                navigate('/');
            }, 3000);

        } catch (err) {
            setSubmitError(err.response?.data?.error || 'Ошибка создания стека');
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Container maxWidth="md" sx={{ mt: 4 }}>
            <Paper sx={{ p: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Создание нового стека
                </Typography>

                {submitError && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError('')}>
                        {submitError}
                    </Alert>
                )}

                {successMessage && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMessage('Сборка запущена!')}>
                        {successMessage}
                    </Alert>
                )}

                <TextField
                    fullWidth
                    label="Имя стека"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    margin="normal"
                    variant="outlined"
                    required
                    disabled={submitting}
                    helperText="Только латинские буквы, цифры и дефис"
                />

                <FormControl fullWidth margin="normal" required>
                    <InputLabel>Ветка Git</InputLabel>
                    <Select
                        name="git_branch"
                        value={formData.git_branch}
                        onChange={handleChange}
                        label="Ветка Git"
                        disabled={loadingBranches || submitting}
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
                        disabled={submitting}
                    >
                        <MenuItem value="full">Полный стек (Laravel + React)</MenuItem>
                        <MenuItem value="api">Только API</MenuItem>
                    </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={handleCreateStack}
                        disabled={submitting || !formData.name || !formData.git_branch}
                        startIcon={<BuildIcon />}
                        sx={{ flex: 1 }}
                    >
                        {submitting ? <CircularProgress size={24} /> : 'Создать стек'}
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}

export default CreateStack;