const dockerUtils = require('../utils/dockerUtils');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util');
const execPromise = util.promisify(require('child_process').exec);

const COMPOSE_FILE_MAP = {
    'full': 'docker-compose.ib.yml',
    'stack': 'docker-compose.compass.yml',
    'backend': 'docker-compose.compass.java.yml',
    'db': 'docker-compose.compass.db.yml',
};

exports.listStacks = (req, res) => {
    try {
        const stacks = dockerUtils.getStacks();
        res.json({ success: true, stacks });
    } catch (err) {
        console.error('Ошибка получения списка стеков:', err);
        res.status(500).json({ success: false, error: err.message, stacks: [] });
    }
};

exports.getStackInfo = (req, res) => {
    const stackName = req.params.name;
    try {
        const containers = dockerUtils.getDetailedContainerInfo(stackName);
        const ports = dockerUtils.getContainerPorts(stackName);
        res.json({ 
            success: true, 
            stackName, 
            containers,
            ports,
            urls: {
                app: ports.app ? `http://localhost:${ports.app}` : null,
                web: ports.web ? `http://localhost:${ports.web}` : null,
                frontend: ports.frontend ? `http://localhost:${ports.frontend}` : null,
                phpmyadmin: ports.phpmyadmin ? `http://localhost:${ports.phpmyadmin}` : null
            }
        });
    } catch (err) {
        console.error(`Ошибка получения информации о стеке ${stackName}:`, err);
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getStackPorts = (req, res) => {
    const stackName = req.params.name;
    try {
        const ports = dockerUtils.getContainerPorts(stackName);
        res.json({
            success: true,
            stackName,
            ports: ports,
            urls: {
                app: ports.app ? `http://localhost:${ports.app}` : null,
                web: ports.web ? `http://localhost:${ports.web}` : null,
                frontend: ports.frontend ? `http://localhost:${ports.frontend}` : null,
                phpmyadmin: ports.phpmyadmin ? `http://localhost:${ports.phpmyadmin}` : null
            }
        });
    } catch (err) {
        console.error(`Ошибка получения портов стека ${stackName}:`, err);
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.startStack = async (req, res) => {
    const { git_branch, stackType } = req.body;
    const stackName = req.params.name;
    const operationId = `${stackName}_${Date.now()}`;

    console.log(`Запуск стека: ${stackName}, ветка: ${git_branch}, тип: ${stackType}`);

    
    res.json({
        success: true,
        message: 'Создание стека запущено',
        operationId: operationId
    });

   
    dockerUtils.startStackAsync(git_branch, stackType, stackName, operationId);
};

exports.deleteStack = async (req, res) => {
    const stackName = req.params.name;
    const operationId = `${stackName}_delete_${Date.now()}`;

    res.json({
        success: true,
        message: 'Удаление стека запущено',
        operationId: operationId
    });

    dockerUtils.deleteStackAsync(stackName, operationId);
};

exports.restartStack = async (req, res) => {
    const stackName = req.params.name;

    try {
        console.log(`Перезапуск стека: ${stackName}`);
        const stackDir = path.join(global.STACKS_DIR, stackName);

        if (!fs.existsSync(stackDir)) {
            return res.status(404).json({ success: false, error: `Директория стека ${stackName} не найдена` });
        }

        let projectName = stackName;
        let composeFile = 'docker-compose.yml';

        const envPath = path.join(stackDir, '.env');
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const stackNameMatch = envContent.match(/^STACK_NAME=(.+)$/m);
            if (stackNameMatch) projectName = stackNameMatch[1];

            const possibleFiles = Object.values(COMPOSE_FILE_MAP).concat(['docker-compose.yml', 'docker-compose.yaml']);
            for(const file of possibleFiles) {
                if(fs.existsSync(path.join(stackDir, file))) {
                    composeFile = file;
                    break;
                }
            }
        }

        const command = `cd "${stackDir}" && docker-compose --env-file .env -f ${composeFile} -p ${projectName} restart`;
        console.log(`Выполняю команду: ${command}`);
        const { stdout, stderr } = await execPromise(command);

        console.log(`Стек ${stackName} перезапущен.`);
        res.json({ success: true, message: `Стек ${stackName} успешно перезапущен`, stdout, stderr });

    } catch (err) {
        console.error(`Ошибка перезапуска стека ${stackName}:`, err);
        res.status(500).json({ success: false, error: err.message, stdout: err.stdout, stderr: err.stderr });
    }
};

exports.restartContainer = (req, res) => {
    const containerId = req.params.id;
    try {
        execSync(`docker restart ${containerId}`, { stdio: 'inherit' });
        res.json({ success: true, message: 'Container restarted' });
    } catch (error) {
        console.error(`Ошибка перезапуска контейнера ${containerId}:`, error);
        res.status(500).json({ success: false, error: error.message });
    }
};