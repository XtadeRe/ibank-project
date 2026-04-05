pipeline {
    agent any

    parameters {
        string(name: 'BRANCH', defaultValue: 'createStack', description: 'Git branch')
        choice(name: 'STACK_TYPE', choices: ['compass', 'full', 'api', 'db'], description: 'Stack type')
        string(name: 'STACK_NAME', defaultValue: 'mycompass', description: 'Stack name')
    }

    stages {
        stage('Deploy Stack') {
            steps {
                script {
                    // Используйте IP вашей Windows машины
                    def agentUrl = 'http://192.168.1.100:3001'  // ЗАМЕНИТЕ НА ВАШ IP

                    def response = httpRequest(
                        url: "${agentUrl}/api/stacks/${params.STACK_NAME}/up",
                        httpMode: 'POST',
                        contentType: 'APPLICATION_JSON',
                        requestBody: """
                            {
                                "git_branch": "${params.BRANCH}",
                                "stackType": "${params.STACK_TYPE}"
                            }
                        """,
                        validResponseCodes: '200,201,202',
                        timeout: 300000
                    )
                    println("Response: ${response.content}")
                }
            }
        }
    }
}