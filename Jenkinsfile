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
                    def agentUrl = 'http://host.docker.internal:3001'
                    def response = httpRequest(
                        url: "${agentUrl}/api/stacks/${params.STACK_NAME}/up",
                        httpMode: 'POST',
                        contentType: 'APPLICATION_JSON',
                        requestBody: """
                            {
                                "git_branch": "${params.BRANCH}",
                                "stackType": "${params.STACK_TYPE}"
                            }
                        """
                    )
                    println("Response: ${response.content}")
                }
            }
        }
    }
}