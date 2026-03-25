import React, { useState, useEffect, useContext } from 'react';
import {
    Container, Typography, Paper, TextField, Button,
    FormControl, InputLabel, Select, MenuItem,
    CircularProgress, Alert, Box, Snackbar, Link
} from '@mui/material';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import BuildIcon from '@mui/icons-material/Build';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
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
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [createdStackName, setCreatedStackName] = useState('');

    // Валидация имени стека
    const [nameError, setNameError] = useState('');

    // Загрузка веток при монтировании
    useEffect(() => {
        fetchBranches();
    }, []);

    // Валидация имени стека
    const validateName = (name) => {
        const regex = /^[a-z0-9-]+$/;
        if (!name) {
            setNameError('');
            return true;
        }
        if (!regex.test(name)) {
            setNameError('Только латинские буквы (нижний регистр), цифры и дефис');
            return false;
        }
        if (name.length < 3) {
            setNameError('Имя должно содержать минимум 3 символа');
            return false;
        }
        if (name.length > 30) {
            setNameError('Имя не должно превышать 30 символов');
            return false;
        }
        setNameError('');
        return true;
    };

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
        if (name === 'name') {
            validateName(value);
        }
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Создание стека через Jenkins
    const handleCreateStack = async () => {
        // Валидация
        if (!formData.name) {
            setSubmitError('Введите имя стека');
            return;
        }
        if (!validateName(formData.name)) {
            setSubmitError(nameError);
            return;
        }

        // Для full и api типов нужна ветка, для db - нет
        if (formData.stack_type !== 'db' && !formData.git_branch) {
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
                type: formData.stack_type,
                branch: formData.git_branch || 'none'
            });
            localStorage.setItem('creatingStacks', JSON.stringify(creatingStacks));

            // Отправляем запрос в Jenkins
            const response = await axios.post(`${API_URL}/jenkins/deploy`, {
                branch: formData.git_branch || 'develop',
                stack_type: formData.stack_type,
                stack_name: formData.name,
                machine_ip: formData.machine_ip
            });

            setCreatedStackName(formData.name);
            setSuccessMessage(`Стек "${formData.name}" успешно создан! Сборка #${response.data.build_number} запущена.`);
            setSnackbarOpen(true);

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
        <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
            <Paper sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <BuildIcon color="primary" fontSize="large" />
                    <Typography variant="h4">
                        Создание нового стека
                    </Typography>
                </Box>

                <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
                    Создание стека занимает 1-3 минуты. После создания вы будете перенаправлены на главную страницу,
                    где сможете отслеживать статус создания.
                </Typography>

                {submitError && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSubmitError('')}>
                        {submitError}
                    </Alert>
                )}

                {successMessage && (
                    <Alert
                        severity="success"
                        sx={{ mb: 2 }}
                        icon={<CheckCircleIcon />}
                        onClose={() => setSuccessMessage('')}
                    >
                        {successMessage}
                        <Box sx={{ mt: 1 }}>
                            <Link href="/" underline="hover">
                                Перейти к списку стеков →
                            </Link>
                        </Box>
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
                    error={!!nameError}
                    helperText={nameError || "Пример: my-app, test-stack, project-123"}
                    InputProps={{
                        sx: { fontFamily: 'monospace' }
                    }}
                />

                {/* Поле выбора ветки - отображается только для full и api */}
                {formData.stack_type !== 'db' && (
                    <FormControl fullWidth margin="normal" required error={!!branchesError}>
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
                                    <CircularProgress size={20} sx={{ mr: 1 }} /> Загрузка...
                                </MenuItem>
                            ) : branchesError ? (
                                <MenuItem disabled>
                                    Ошибка загрузки
                                </MenuItem>
                            ) : (
                                branches.map((branch) => (
                                    <MenuItem key={branch} value={branch}>
                                        {branch}
                                        {branch === 'master' && ' (стабильная)'}
                                        {branch === 'develop' && ' (разработка)'}
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
                )}

                <FormControl fullWidth margin="normal">
                    <InputLabel>Тип стека</InputLabel>
                    <Select
                        name="stack_type"
                        value={formData.stack_type}
                        onChange={handleChange}
                        label="Тип стека"
                        disabled={submitting}
                    >
                        <MenuItem value="full">
                            <Box>
                                <Typography>Интернет банк</Typography>
                                <Typography variant="caption" color="textSecondary">
                                    Включает базу данных, PHP бэкенд и React фронтенд
                                </Typography>
                            </Box>
                        </MenuItem>
                        <MenuItem value="api">
                            <Box>
                                <Typography>Backend сервер</Typography>
                                <Typography variant="caption" color="textSecondary">
                                    Включает базу данных и PHP бэкенд (без фронтенда)
                                </Typography>
                            </Box>
                        </MenuItem>
                        <MenuItem value="db">
                            <Box>
                                <Typography>База данных</Typography>
                                <Typography variant="caption" color="textSecondary">
                                    Только MySQL база данных (без бэкенда и фронтенда)
                                </Typography>
                            </Box>
                        </MenuItem>
                    </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
                    <Button
                        variant="outlined"
                        color="secondary"
                        size="large"
                        onClick={() => navigate('/')}
                        disabled={submitting}
                        sx={{ flex: 1 }}
                    >
                        Отмена
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        size="large"
                        onClick={handleCreateStack}
                        disabled={submitting || !formData.name || (formData.stack_type !== 'db' && !formData.git_branch) || !!nameError}
                        startIcon={<BuildIcon />}
                        sx={{ flex: 2 }}
                    >
                        {submitting ? 'Создание...' : 'Создать стек'}
                    </Button>
                </Box>

                {submitting && (
                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="textSecondary">
                            Стек создается, это может занять 1-3 минуты...
                        </Typography>
                        <CircularProgress size={30} sx={{ mt: 1 }} />
                    </Box>
                )}
            </Paper>

            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                message={`Стек "${createdStackName}" успешно создан!`}
                action={
                    <Button color="primary" size="small" onClick={() => navigate('/')}>
                        Перейти
                    </Button>
                }
            />
        </Container>
    );
}

export default CreateStack;