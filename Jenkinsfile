pipeline {
    agent any
    
    environment {
        LARAVEL_API_URL = 'http://host.docker.internal:8000'
        DOCKER_AGENT_URL = 'http://host.docker.internal:3001'
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo '✅ Код получен'
            }
        }
        
        stage('Validate Docker Compose') {
            steps {
                script {
                    // Проверяем наличие compose файлов
                    if (fileExists('docker-compose.yml')) {
                        echo '✅ docker-compose.yml найден'
                    }
                    if (fileExists('docker-compose.ib.yml')) {
                        echo '✅ docker-compose.ib.yml найден'
                    }
                }
            }
        }
        
        stage('Notify Sandbox') {
            steps {
                script {
                    sh """
                        curl -X POST ${LARAVEL_API_URL}/api/jenkins/webhook \\
                            -H "Content-Type: application/json" \\
                            -d '{
                                "branch": "${env.BRANCH_NAME}",
                                "build_number": "${env.BUILD_NUMBER}",
                                "status": "success"
                            }'
                    """
                }
            }
        }
        
        stage('Deploy Test Stack') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    sh """
                        curl -X POST ${LARAVEL_API_URL}/api/sandboxes \\
                            -H "Content-Type: application/json" \\
                            -d '{
                                "name": "auto-${env.BUILD_NUMBER}",
                                "git_branch": "${env.BRANCH_NAME}",
                                "stack_type": "full",
                                "machine_ip": "127.0.0.1"
                            }'
                    """
                }
            }
        }
    }
    
    post {
        success {
            echo '🎉 Pipeline успешно выполнен!'
        }
        failure {
            echo '❌ Pipeline завершился ошибкой'
        }
    }
}
