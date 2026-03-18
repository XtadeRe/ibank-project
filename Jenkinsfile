pipeline {
    agent any
    
    stages {
        stage('Hello') {
            steps {
                echo 'Hello from Jenkins!'
                echo 'Repository cloned successfully'
            }
        }
        
        stage('List files') {
            steps {
                echo 'Files in workspace:'
                sh 'ls -la'
            }
        }
        
        stage('Check docker-compose') {
            steps {
                script {
                    // Проверяем наличие compose файлов
                    if (fileExists('docker-compose.yml')) {
                        echo '✅ docker-compose.yml found'
                    } else {
                        echo '⚠️ docker-compose.yml not found'
                    }
                    
                    if (fileExists('docker-compose.ib.yml')) {
                        echo '✅ docker-compose.ib.yml found'
                    } else {
                        echo '⚠️ docker-compose.ib.yml not found'
                    }
                }
            }
        }
    }
    
    post {
        success {
            echo '🎉 Pipeline completed successfully!'
        }
        failure {
            echo '❌ Pipeline failed'
        }
    }
}
