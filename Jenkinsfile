pipeline {
    agent any
    
    environment {
        DOCKER_AGENT_URL = 'http://192.168.1.100:3001'  // IP твоей машины
        LARAVEL_API_URL = 'http://192.168.1.100:8000'  // IP твоей машины
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
