pipeline {
    agent any
    
    parameters {
        string(name: 'branch', defaultValue: 'develop', description: 'Git branch to build')
        choice(name: 'stack_type', choices: ['full', 'api'], description: 'Stack type')
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
                    
                    if (response.contains('"success":true')) {
                        echo "✅ Stack deployed successfully"
                        
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
                        }
                        
                        if (jsonResponse.urls) {
                            echo "🔗 Access URLs: ${jsonResponse.urls}"
                        }
                    } else {
                        error "❌ Failed to deploy stack: ${response}"
                    }
                }
            }
        }
        
        stage('Wait a moment') {
            steps {
                script {
                    echo "⏳ Waiting for services to be ready..."
                    sleep(time: 10, unit: 'SECONDS')
                    echo "✅ Wait completed"
                }
            }
        }
        
        stage('Display Access URLs') {
            steps {
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
${params.stack_type == 'full' && env.WEB_PORT ? """
║ • Web:      http://localhost:${env.WEB_PORT}              ║
║ • Frontend: http://localhost:${env.FRONTEND_PORT}         ║
║ • API:      http://localhost:${env.WEB_PORT}/api          ║
""" : params.stack_type == 'api' && env.API_PORT ? """
║ • API:      http://localhost:${env.API_PORT}              ║
""" : """
║ • Check Docker Agent logs for URLs                        ║
"""}
╠══════════════════════════════════════════════════════════╣
║ To stop the stack:                                        ║
║ curl -X POST ${DOCKER_AGENT_URL}/api/stacks/${env.STACK_NAME}/down
╚══════════════════════════════════════════════════════════╝
                    """
                }
            }
        }
    }
    
    post {
        success {
            echo "✅ Build ${env.BUILD_NUMBER} completed successfully!"
        }
        
        failure {
            script {
                echo "❌ Build ${env.BUILD_NUMBER} failed!"
                // Пытаемся остановить стек при ошибке
                sh """
                    echo "Cleaning up..."
                    curl -X POST ${DOCKER_AGENT_URL}/api/stacks/${env.STACK_NAME}/down || true
                """
            }
        }
    }
}
