pipeline {
    agent any
    
    stages {
        stage('Hello') {
            steps {
                echo 'Hello from Jenkins!'
            }
        }
        
        stage('Check files') {
            steps {
                script {
                    echo 'Checking repository files...'
                    sh 'ls -la'
                }
            }
        }
    }
    
    post {
        success {
            echo 'Pipeline completed successfully!'
        }
        failure {
            echo 'Pipeline failed!'
        }
    }
}
