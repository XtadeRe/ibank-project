pipeline {
    agent any
    
    parameters {
        string(name: 'branch', defaultValue: 'develop', description: 'Git branch to build')
        string(name: 'stack_type', defaultValue: 'full', description: 'Stack type (full/only-ib)')
        string(name: 'triggered_by', defaultValue: 'jenkins', description: 'Trigger source')
    }
    
    environment {
        LARAVEL_API = 'http://host.docker.internal:8000'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "✅ Branch: ${params.branch}"
            }
        }
        
        stage('Validate') {
            steps {
                script {
                    def composeFile = params.stack_type == 'full' ? 'docker-compose.yml' : 'docker-compose.ib.yml'
                    if (fileExists(composeFile)) {
                        echo "✅ ${composeFile} found"
                    } else {
                        error "${composeFile} not found!"
                    }
                }
            }
        }
        
        stage('Notify Laravel') {
            steps {
                script {
                    sh """
                        curl -X POST ${LARAVEL_API}/api/jenkins/webhook \\
                            -H "Content-Type: application/json" \\
                            -d '{
                                "build": {
                                    "number": ${env.BUILD_NUMBER},
                                    "status": "SUCCESS",
                                    "parameters": {
                                        "branch": "${params.branch}",
                                        "stack_type": "${params.stack_type}"
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
                                "stack_type": "${params.stack_type}"
                            }
                        }
                    }'
            """
        }
    }
}
