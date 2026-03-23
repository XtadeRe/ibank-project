pipeline {
    agent any
    
    parameters {
        string(name: 'branch', defaultValue: 'develop', description: 'Git branch to build')
        choice(name: 'stack_type', choices: ['ibank', 'api'], description: 'Stack type')
        string(name: 'stack_name', defaultValue: '', description: 'Stack name (leave empty for auto-generate)')
    }
    
    environment {
        DOCKER_AGENT_URL = 'http://host.docker.internal:3001'
        // Для Windows используйте эту переменную:
        //DOCKER_AGENT_URL = 'http://172.17.0.1:3001'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "✅ Branch: ${params.branch}"
                echo "📦 Stack Type: ${params.stack_type}"
            }
        }
        
        stage('Generate Stack Name') {
            steps {
                script {
                    // Если имя стека не указано, генерируем автоматически
                    if (params.stack_name == '') {
                        def timestamp = new Date().format('yyyyMMddHHmmss')
                        env.STACK_NAME = "${params.stack_type}-${timestamp}"
                    } else {
                        env.STACK_NAME = params.stack_name
                    }
                    echo "📌 Stack Name: ${env.STACK_NAME}"
                }
            }
        }
        
        stage('Validate Docker Agent') {
            steps {
                script {
                    // Проверяем, доступен ли Docker Agent
                    def healthCheck = sh(
                        script: "curl -s -o /dev/null -w '%{http_code}' ${DOCKER_AGENT_URL}/api/health",
                        returnStdout: true
                    ).trim()
                    
                    if (healthCheck == '200') {
                        echo "✅ Docker Agent is available"
                    } else {
                        error "❌ Docker Agent not available at ${DOCKER_AGENT_URL}"
                    }
                }
            }
        }
        
        stage('Deploy Stack') {
            steps {
                script {
                    echo "🚀 Deploying stack: ${env.STACK_NAME}"
                    
                    // Запускаем стек через Docker Agent
                    def response = sh(
                        script: """
                            curl -X POST ${DOCKER_AGENT_URL}/api/stacks/${env.STACK_NAME}/up \
                            -H "Content-Type: application/json" \
                            -d '{
                                "git_branch": "${params.branch}",
                                "stackType": "${params.stack_type}"
                            }'
                        """,
                        returnStdout: true
                    ).trim()
                    
                    echo "📡 Deploy Response: ${response}"
                    
                    // Парсим ответ
                    if (response.contains('"success":true')) {
                        echo "✅ Stack deployed successfully"
                        
                        // Извлекаем порты из ответа (если есть)
                        def webPort = (response =~ /"web":(\d+)/) ? response =~ /"web":(\d+/[0,1] : null
                        def frontendPort = (response =~ /"frontend":(\d+)/) ? response =~ /"frontend":(\d+/[0,1] : null
                        
                        if (webPort) {
                            env.WEB_PORT = webPort
                            echo "🌐 Web Server Port: ${env.WEB_PORT}"
                        }
                        if (frontendPort) {
                            env.FRONTEND_PORT = frontendPort
                            echo "🎨 Frontend Port: ${env.FRONTEND_PORT}"
                        }
                    } else {
                        error "❌ Failed to deploy stack: ${response}"
                    }
                }
            }
        }
        
        stage('Wait for Services') {
            steps {
                script {
                    echo "⏳ Waiting for services to be ready..."
                    sleep(time: 10, unit: 'SECONDS')
                    
                    // Ждем, пока контейнеры поднимутся
                    def maxAttempts = 30
                    def ready = false
                    
                    for (int i = 1; i <= maxAttempts; i++) {
                        def runningContainers = sh(
                            script: "docker ps --filter name=${env.STACK_NAME} --format '{{.Names}}' | wc -l",
                            returnStdout: true
                        ).trim()
                        
                        if (runningContainers.toInteger() > 0) {
                            echo "✅ ${runningContainers} containers are running"
                            ready = true
                            break
                        }
                        
                        echo "Attempt ${i}/${maxAttempts}: Waiting for containers..."
                        sleep(time: 2, unit: 'SECONDS')
                    }
                    
                    if (!ready) {
                        error "❌ Containers failed to start within timeout"
                    }
                }
            }
        }
        
        stage('Get Container Info') {
            steps {
                script {
                    // Получаем информацию о портах
                    def containersInfo = sh(
                        script: """
                            docker ps --filter name=${env.STACK_NAME} --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
                        """,
                        returnStdout: true
                    ).trim()
                    
                    echo "📋 Container Information:\n${containersInfo}"
                    
                    // Сохраняем информацию в файл
                    writeFile file: "deploy-info-${env.STACK_NAME}.txt", text: """
Deployment Information
======================
Stack Name: ${env.STACK_NAME}
Stack Type: ${params.stack_type}
Branch: ${params.branch}
Build Number: ${env.BUILD_NUMBER}
Timestamp: ${new Date()}

Containers:
${containersInfo}

Access URLs:
${params.stack_type == 'ibank' ? """
- Web Server: http://localhost:${env.WEB_PORT}
- Frontend: http://localhost:${env.FRONTEND_PORT}
- API: http://localhost:${env.WEB_PORT}/api
""" : """
- API: http://localhost:${env.API_PORT}
"""}
                    """
                    
                    archiveArtifacts artifacts: "deploy-info-${env.STACK_NAME}.txt"
                }
            }
        }
        
        stage('Notify Laravel') {
            when {
                expression { params.stack_type == 'ibank' }
            }
            steps {
                script {
                    // Получаем порт веб-сервера для отправки вебхука
                    def webPort = env.WEB_PORT ?: sh(
                        script: """
                            docker ps --filter name=${env.STACK_NAME}_webserver --format '{{.Ports}}' | grep -oP '0.0.0.0:\\K\\d+(?=->80)'
                        """,
                        returnStdout: true
                    ).trim()
                    
                    if (webPort) {
                        echo "📨 Sending webhook to Laravel on port ${webPort}"
                        
                        def laravelUrl = "http://host.docker.internal:${webPort}"
                        
                        sh """
                            curl -X POST ${laravelUrl}/api/jenkins/webhook \
                            -H "Content-Type: application/json" \
                            -d '{
                                "build": {
                                    "number": ${env.BUILD_NUMBER},
                                    "status": "SUCCESS",
                                    "url": "${env.JOB_URL}${env.BUILD_NUMBER}/",
                                    "parameters": {
                                        "branch": "${params.branch}",
                                        "stack_type": "${params.stack_type}",
                                        "stack_name": "${env.STACK_NAME}",
                                        "web_port": ${webPort},
                                        "frontend_port": ${env.FRONTEND_PORT ?: 'null'}
                                    }
                                }
                            }' || true
                        """
                        
                        echo "✅ Webhook sent successfully"
                    } else {
                        echo "⚠️ Could not determine web port, skipping webhook"
                    }
                }
            }
        }
    }
    
    post {
        success {
            script {
                echo """
                🎉 DEPLOYMENT SUCCESSFUL! 🎉
                
                Stack: ${env.STACK_NAME}
                Type: ${params.stack_type}
                Branch: ${params.branch}
                
                ${params.stack_type == 'ibank' ? """
                Access your application:
                • Web: http://localhost:${env.WEB_PORT}
                • Frontend: http://localhost:${env.FRONTEND_PORT}
                • API: http://localhost:${env.WEB_PORT}/api
                """ : """
                Access your API:
                • API: http://localhost:${env.API_PORT}
                """}
                
                To stop the stack:
                curl -X POST ${DOCKER_AGENT_URL}/api/stacks/${env.STACK_NAME}/down
                """
            }
        }
        
        failure {
            script {
                echo """
                ❌ DEPLOYMENT FAILED! ❌
                
                Stack: ${env.STACK_NAME}
                Type: ${params.stack_type}
                Branch: ${params.branch}
                
                Check the logs above for more details.
                """
                
                // Отправляем уведомление о неудаче
                sh """
                    curl -X POST ${DOCKER_AGENT_URL}/api/stacks/${env.STACK_NAME}/down || true
                """
            }
        }
        
        always {
            script {
                echo """
                ========================================
                Build ${env.BUILD_NUMBER} completed
                Job: ${env.JOB_NAME}
                Status: ${currentBuild.currentResult}
                ========================================
                """
            }
        }
    }
}
