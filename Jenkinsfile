pipeline {
    agent any
    
    parameters {
        choice(
            name: 'branch',
            choices: ['master', 'develop'],
            description: 'Выберите ветку для сборки'
        )
        choice(
            name: 'stack_type',
            choices: ['full', 'only-ib'],
            description: 'Тип стека'
        )
        string(
            name: 'stack_name',
            defaultValue: '',
            description: 'Введите имя стека (оставьте пустым для авто-генерации)'
        )
    }
    
    environment {
        LARAVEL_API = 'http://host.docker.internal:8000'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "Branch: ${params.branch}"
                echo "Stack type: ${params.stack_type}"
                echo "Stack name: ${params.stack_name ?: 'будет сгенерирован'}"
            }
        }
        
        stage('Validate') {
            steps {
                script {
                    def composeFile = params.stack_type == 'full' ? 'docker-compose.yml' : 'docker-compose.ib.yml'
                    if (fileExists(composeFile)) {
                        echo "${composeFile} found"
                    } else {
                        error "${composeFile} not found!"
                    }
                }
            }
        }
        
        stage('Notify Laravel') {
            steps {
                script {
                    // Определяем имя стека
                    def stackName = params.stack_name ?: "jenkins-${params.branch}-${env.BUILD_NUMBER}"
                    
                    sh """
                        curl -X POST ${LARAVEL_API}/api/jenkins/webhook \\
                            -H "Content-Type: application/json" \\
                            -d '{
                                "build": {
                                    "number": ${env.BUILD_NUMBER},
                                    "status": "${currentBuild.currentResult}",
                                    "parameters": {
                                        "branch": "${params.branch}",
                                        "stack_type": "${params.stack_type}",
                                        "stack_name": "${stackName}"
                                    }
                                }
                            }'
                    """
                }
            }
        }
    }
    
    post {
        failure {
            sh """
                curl -X POST ${LARAVEL_API}/api/jenkins/webhook \\
                    -H "Content-Type: application/json" \\
                    -d '{
                        "build": {
                            "number": ${env.BUILD_NUMBER},
                            "status": "FAILURE",
                            "parameters": {
                                "branch": "${params.branch}",
                                "stack_type": "${params.stack_type}",
                                "stack_name": "${params.stack_name}"
                            }
                        }
                    }'
            """
        }
    }
}
