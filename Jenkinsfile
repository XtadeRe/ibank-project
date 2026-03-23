pipeline {
    agent any
    
    parameters {
        string(name: 'branch', defaultValue: 'develop', description: 'Git branch to build')
        choice(name: 'stack_type', choices: ['full', 'api'], description: 'Stack type (full = web + frontend + db, api = only API)')
        string(name: 'stack_name', defaultValue: '', description: 'Stack name (leave empty for auto-generate)')
    }
    
    environment {
        DOCKER_AGENT_URL = 'http://host.docker.internal:3001'
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
                        echo "✅ Docker Agent is available at ${DOCKER_AGENT_URL}"
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
                        
                        // Извлекаем порты из ответа
                        def jsonSlurper = new groovy.json.JsonSlurper()
                        def jsonResponse = jsonSlurper.parseText(response)
                        
                        if (jsonResponse.ports) {
                            if (jsonResponse.ports.web) {
                                env.WEB_PORT = jsonResponse.ports.web
                                echo "🌐 Web Server Port: ${env.WEB_PORT}"
                            }
                            if (jsonResponse.ports.frontend) {
                                env.FRONTEND_PORT = jsonResponse.ports.frontend
                                echo "🎨 Frontend Port: ${env.FRONTEND_PORT}"
                            }
                            if (jsonResponse.ports.api) {
                                env.API_PORT = jsonResponse.ports.api
                                echo "🔌 API Port: ${env.API_PORT}"
                            }
                        }
                        
                        // Сохраняем URL для доступа
                        if (jsonResponse.urls) {
                            env.ACCESS_URLS = jsonResponse.urls.toString()
                            echo "🔗 Access URLs: ${env.ACCESS_URLS}"
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
                    sleep(time: 5, unit: 'SECONDS')
                    
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
        
        stage('Health Check') {
            steps {
                script {
                    echo "🏥 Performing health checks..."
                    
                    if (params.stack_type == 'full' && env.WEB_PORT) {
                        // Проверяем веб-сервер
                        def webHealth = sh(
                            script: "curl -s -o /dev/null -w '%{http_code}' http://localhost:${env.WEB_PORT}/api/health",
                            returnStdout: true
                        ).trim()
                        
                        if (webHealth == '200') {
                            echo "✅ Web server health check passed (HTTP ${webHealth})"
                        } else {
                            echo "⚠️ Web server health check returned HTTP ${webHealth}"
                        }
                        
                        // Проверяем фронтенд
                        if (env.FRONTEND_PORT) {
                            def frontendHealth = sh(
                                script: "curl -s -o /dev/null -w '%{http_code}' http://localhost:${env.FRONTEND_PORT}",
                                returnStdout: true
                            ).trim()
                            
                            if (frontendHealth == '200') {
                                echo "✅ Frontend health check passed (HTTP ${frontendHealth})"
                            } else {
                                echo "⚠️ Frontend health check returned HTTP ${frontendHealth}"
                            }
                        }
                    } else if (params.stack_type == 'api' && env.API_PORT) {
                        def apiHealth = sh(
                            script: "curl -s -o /dev/null -w '%{http_code}' http://localhost:${env.API_PORT}/health",
                            returnStdout: true
                        ).trim()
                        
                        if (apiHealth == '200') {
                            echo "✅ API health check passed (HTTP ${apiHealth})"
                        } else {
                            echo "⚠️ API health check returned HTTP ${apiHealth}"
                        }
                    }
                }
            }
        }
        
        stage('Get Container Info') {
            steps {
                script {
                    // Получаем информацию о контейнерах
                    def containersInfo = sh(
                        script: """
                            docker ps --filter name=${env.STACK_NAME} --format 'table {{.Names}}\t{{.Ports}}\t{{.Status}}'
                        """,
                        returnStdout: true
                    ).trim()
                    
                    echo "📋 Container Information:\n${containersInfo}"
                    
                    // Сохраняем информацию в файл
                    writeFile file: "deploy-info-${env.STACK_NAME}.txt", text: """
========================================
DEPLOYMENT INFORMATION
========================================

Stack Name: ${env.STACK_NAME}
Stack Type: ${params.stack_type}
Branch: ${params.branch}
Build Number: ${env.BUILD_NUMBER}
Build URL: ${env.BUILD_URL}
Timestamp: ${new Date()}
Jenkins Job: ${env.JOB_NAME}

----------------------------------------
CONTAINERS
----------------------------------------
${containersInfo}

----------------------------------------
ACCESS URLs
----------------------------------------
${params.stack_type == 'full' ? """
Web Server:    http://localhost:${env.WEB_PORT}
Frontend:      http://localhost:${env.FRONTEND_PORT}
API:           http://localhost:${env.WEB_PORT}/api
""" : """
API:           http://localhost:${env.API_PORT}
"""}

----------------------------------------
DOCKER COMMANDS
----------------------------------------
View logs:
  docker logs ${env.STACK_NAME}_webserver
  docker logs ${env.STACK_NAME}_php
  docker logs ${env.STACK_NAME}_db

Stop stack:
  curl -X POST ${DOCKER_AGENT_URL}/api/stacks/${env.STACK_NAME}/down

Remove stack:
  docker rm -f \$(docker ps -a -q --filter name=${env.STACK_NAME})

========================================
"""
                    
                    archiveArtifacts artifacts: "deploy-info-${env.STACK_NAME}.txt"
                }
            }
        }
        
        stage('Notify Laravel') {
            when {
                expression { params.stack_type == 'full' && env.WEB_PORT != null }
            }
            steps {
                script {
                    def webPort = env.WEB_PORT
                    echo "📨 Sending webhook to Laravel on port ${webPort}"
                    
                    def laravelUrl = "http://host.docker.internal:${webPort}"
                    
                    sh """
                        curl -X POST ${laravelUrl}/api/jenkins/webhook \
                        -H "Content-Type: application/json" \
                        -d '{
                            "build": {
                                "number": ${env.BUILD_NUMBER},
                                "status": "SUCCESS",
                                "url": "${env.BUILD_URL}",
                                "parameters": {
                                    "branch": "${params.branch}",
                                    "stack_type": "${params.stack_type}",
                                    "stack_name": "${env.STACK_NAME}",
                                    "web_port": ${webPort},
                                    "frontend_port": ${env.FRONTEND_PORT ?: 'null'},
                                    "api_port": ${env.API_PORT ?: 'null'}
                                }
                            }
                        }' || true
                    """
                    
                    echo "✅ Webhook sent successfully"
                }
            }
        }
    }
    
    post {
        success {
            script {
                echo """
╔══════════════════════════════════════════════════════════╗
║           🎉 DEPLOYMENT SUCCESSFUL! 🎉                    ║
╠══════════════════════════════════════════════════════════╣
║ Stack: ${env.STACK_NAME}                                  
║ Type: ${params.stack_type}                                
║ Branch: ${params.branch}                                  
║ Build: ${env.BUILD_NUMBER}                                
╠══════════════════════════════════════════════════════════╣
║ ACCESS URLs:                                              ║
${params.stack_type == 'full' ? """
║ • Web:      http://localhost:${env.WEB_PORT}              ║
║ • Frontend: http://localhost:${env.FRONTEND_PORT}         ║
║ • API:      http://localhost:${env.WEB_PORT}/api          ║
""" : """
║ • API:      http://localhost:${env.API_PORT}              ║
"""}
╠══════════════════════════════════════════════════════════╣
║ To stop the stack:                                        ║
║ curl -X POST ${DOCKER_AGENT_URL}/api/stacks/${env.STACK_NAME}/down
╚══════════════════════════════════════════════════════════╝
                """
            }
        }
        
        failure {
            script {
                echo """
╔══════════════════════════════════════════════════════════╗
║           ❌ DEPLOYMENT FAILED! ❌                        ║
╠══════════════════════════════════════════════════════════╣
║ Stack: ${env.STACK_NAME}                                  
║ Type: ${params.stack_type}                                
║ Branch: ${params.branch}                                  
║ Build: ${env.BUILD_NUMBER}                                
╠══════════════════════════════════════════════════════════╣
║ Check the logs above for more details.                   ║
╚══════════════════════════════════════════════════════════╝
                """
                
                // Пытаемся остановить стек при ошибке
                sh """
                    echo "Cleaning up failed deployment..."
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
Duration: ${currentBuild.durationString}
========================================
                """
            }
        }
    }
}
