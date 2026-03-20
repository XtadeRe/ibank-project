import React from 'react';
import { Container, Typography } from '@mui/material';
import ContainerList from '../components/ContainerList';

function Dashboard() {
    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <ContainerList />
        </Container>
    );
}

export default Dashboard;