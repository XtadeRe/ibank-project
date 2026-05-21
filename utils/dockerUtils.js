const { exec, execSync, spawn } = require("child_process");
const util = require("util");
const fs = require("fs");
const path = require("path");
const NodeCache = require("node-cache");

const stacksCache = new NodeCache({ stdTTL: 3, checkperiod: 1 });
const stackInfoCache = new NodeCache({ stdTTL: 5, checkperiod: 1 });
const portsCache = new NodeCache({ stdTTL: 5, checkperiod: 1 });

let isRefreshing = false;
let backgroundPauseCount = 0;

const execPromise = util.promisify(exec);

function pauseBackgroundUpdate() {
  backgroundPauseCount++;
  console.log(
    `Фоновое обновление приостановлено (pauseCount: ${backgroundPauseCount})`,
  );
}

function resumeBackgroundUpdate() {
  if (backgroundPauseCount > 0) {
    backgroundPauseCount--;
    console.log(
      `Фоновое обновление возобновлено (pauseCount: ${backgroundPauseCount})`,
    );
  }
}

function clearStackCache(stackName) {
  const infoKey = `info_${stackName}`;
  const portsKey = `ports_${stackName}`;
  stackInfoCache.del(infoKey);
  portsCache.del(portsKey);
  stacksCache.del("stacks");
  console.log(`Кэш очищен для стека ${stackName}`);
}

setInterval(() => {
  try {
    if (backgroundPauseCount > 0) {
      console.log("Фоновое обновление кэша пропущено (операция в процессе)...");
      return;
    }
    console.log("Фоновое обновление кэша...");
    getStacks();
    console.log("Кэш обновлен");
  } catch (err) {
    console.error("Ошибка обновления кэша:", err);
  }
}, 60000);

function getStacks() {
  const containersOutput = execSync('docker ps -a --format "{{.Names}}"', {
    encoding: "utf8",
  });
  const allContainers = containersOutput
    .trim()
    .split("\n")
    .filter((n) => n);

  const stackNames = new Set();
  allContainers.forEach((containerName) => {
    const parts = containerName.split("_");
    if (parts.length > 1) {
      stackNames.add(parts[0]);
    }
  });

  return Array.from(stackNames).map((name) => ({ name, running: true }));
}

function getContainerPorts(stackName) {
  try {
    const containers = execSync(
      `docker ps --filter "name=${stackName}" --format "{{.Names}}|{{.Ports}}"`,
      { encoding: "utf8" },
    );
    const ports = { web: null, frontend: null, phpmyadmin: null, app: null };

    const lines = containers.trim().split("\n");
    lines.forEach((line) => {
      if (!line.trim()) return;
      const [name, portsStr] = line.split("|");

      if (name.includes("_app")) {
        const match = portsStr.match(/0\.0\.0\.0:(\d+)->8080/);
        if (match) ports.app = match[1];
      }
      if (name.includes("_web") || name.includes("_php")) {
        const match = portsStr.match(/0\.0\.0\.0:(\d+)->8000/);
        if (match) ports.web = match[1];
      }
      if (name.includes("_phpmyadmin")) {
        const match = portsStr.match(/0\.0\.0\.0:(\d+)->80/);
        if (match && !ports.phpmyadmin) ports.phpmyadmin = match[1];
      }
      if (name.includes("_frontend")) {
        const match = portsStr.match(/0\.0\.0\.0:(\d+)->\d+/);
        if (match) ports.frontend = match[1];
      }
    });

    return ports;
  } catch (err) {
    console.error(`Ошибка получения портов для ${stackName}:`, err.message);
    return { web: null, frontend: null, phpmyadmin: null, app: null };
  }
}

function getDetailedContainerInfo(stackName) {
  try {
    const containersOutput = execSync(
      `docker ps -a --filter "name=${stackName}" --format "{{json .}}"`,
      { encoding: "utf8" },
    );
    const containers = containersOutput
      .trim()
      .split("\n")
      .filter((l) => l)
      .map((line) => {
        try {
          const data = JSON.parse(line);
          return {
            id: data.ID,
            name: data.Names,
            image: data.Image,
            state: data.State,
            status: data.Status,
          };
        } catch (parseErr) {
          console.error(`Ошибка парсинга JSON контейнера: ${line}`, parseErr);
          return null;
        }
      })
      .filter((c) => c);

    return containers;
  } catch (err) {
    console.error(
      `Ошибка получения информации о контейнерах для ${stackName}:`,
      err.message,
    );
    return [];
  }
}

function runCommandStream(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });

    child.stdout.on("data", (data) => {
      const text = data.toString("utf8");
      process.stdout.write(text);
    });

    child.stderr.on("data", (data) => {
      const text = data.toString("utf8");
      process.stderr.write(text);
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve({ code });
      else
        reject(
          new Error(
            `Command failed: ${command} ${args.join(" ")} (exit code: ${code})`,
          ),
        );
    });
  });
}

async function startStackAsync(git_branch, stackType, stackName, operationId) {
  const stackDir = path.join(global.STACKS_DIR, stackName);
  const COMPOSE_FILE_MAP = {
    full: "docker-compose.ib.yml",
    stack: "docker-compose.compass.yml",
    backend: "docker-compose.compass.java.yml",
    db: "docker-compose.compass.db.yml",
    studygate: "docker-compose.yml",
  };

  pauseBackgroundUpdate();
  try {
    if (!git_branch) {
      throw new Error("git_branch обязателен");
    }

    global.activeOperations.set(operationId, {
      id: operationId,
      status: "pending",
      progress: 0,
      message: "Инициализация...",
      timestamp: new Date(),
    });

    global.activeOperations.set(operationId, {
      id: operationId,
      status: "running",
      progress: 5,
      message: "Удаляем старую папку стека...",
    });

    if (fs.existsSync(stackDir)) {
      fs.rmSync(stackDir, { recursive: true, force: true });
    }

    global.activeOperations.set(operationId, {
      id: operationId,
      status: "running",
      progress: 15,
      message: "Клонируем репозиторий...",
    });

    await execPromise(
      `git clone --branch ${git_branch} --depth 1 https://github.com/XtadeRe/ibank-project.git "${stackDir}"`,
    );

    global.activeOperations.set(operationId, {
      id: operationId,
      status: "running",
      progress: 25,
      message: "Настраиваем конфигурацию...",
    });

    const composeFile = COMPOSE_FILE_MAP[stackType] || "docker-compose.ib.yml";
    const composeFilePath = path.join(stackDir, composeFile);

    if (!fs.existsSync(composeFilePath)) {
      throw new Error(`Compose файл ${composeFile} не найден`);
    }

    let webPort = null;
    let frontendPort = null;
    let dbPort = null;
    let appPort = null;

    if (stackType === "full") {
      webPort = 8080 + Math.floor(Math.random() * 100) + 1;
      frontendPort = 3200 + Math.floor(Math.random() * 100);
    } else if (stackType === "backend") {
      appPort = 8080 + Math.floor(Math.random() * 100) + 1;
      dbPort = 3306 + Math.floor(Math.random() * 100);
    } else if (stackType === "stack") {
      appPort = 8080 + Math.floor(Math.random() * 100) + 1;
      dbPort = 3306 + Math.floor(Math.random() * 100);
      webPort = 8081 + Math.floor(Math.random() * 100);
    } else if (stackType === "db") {
      dbPort = 3306 + Math.floor(Math.random() * 100);
    } else if (stackType === "studygate") {
      webPort = 8080 + Math.floor(Math.random() * 100) + 1;
      frontendPort = 5173 + Math.floor(Math.random() * 100);
      dbPort = 3306 + Math.floor(Math.random() * 100);
    }

    const pmaPort = 9088 + Math.floor(Math.random() * 100);

    let envContent = "";

    if (stackType === "studygate") {
      envContent = `
STACK_NAME=${stackName}
SITE_STACK_NAME=${stackName}
WEB_PORT=${webPort || "8081"}
APP_PORT=
FRONTEND_PORT=${frontendPort || "5173"}
DB_PORT=${dbPort || "3306"}
PMA_PORT=${pmaPort}
APP_ENV=development
APP_DEBUG=true
DB_NAME=sandbox
DB_USER=root
DB_PASSWORD=root
DB_ROOT_PASSWORD=root
PHP_VERSION=8.2
MYSQL_VERSION=8.0

# Database connection
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=sandbox
DB_USERNAME=root
DB_PASSWORD=root

# Laravel
APP_KEY=

# Frontend Vite config
VITE_APP_URL=http://localhost:${webPort || "8081"}
VITE_API_URL=http://localhost:${webPort || "8081"}/api
`;
    } else {
      envContent = `STACK_NAME=${stackName}
SITE_STACK_NAME=${stackName}
WEB_PORT=${webPort || ""}
APP_PORT=${appPort || ""}
FRONTEND_PORT=${frontendPort || ""}
DB_PORT=${dbPort || ""}
PMA_PORT=${pmaPort}
APP_ENV=development
APP_DEBUG=true
DB_NAME=${stackType === "stack" ? "compass_bank" : "sandbox"}
DB_USER=root
DB_PASSWORD=
DB_ROOT_PASSWORD=
PHP_VERSION=8.2
MYSQL_VERSION=8.0
`;
    }
    fs.writeFileSync(path.join(stackDir, ".env"), envContent);

    if (stackType === "full" && webPort) {
      const laravelEnv = `APP_NAME=Laravel
APP_ENV=development
APP_DEBUG=true
APP_KEY=
APP_URL=http://localhost:${webPort}
DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=sandbox
DB_USERNAME=root
DB_PASSWORD=
`;
      const backendEnvPath = path.join(stackDir, "backend", ".env");
      if (fs.existsSync(path.dirname(backendEnvPath))) {
        fs.writeFileSync(backendEnvPath, laravelEnv);
      }
    }

    global.activeOperations.set(operationId, {
      id: operationId,
      status: "running",
      progress: 40,
      message: "Запускаем Docker Compose...",
    });

    await runCommandStream(
      "docker-compose",
      ["--env-file", ".env", "-f", composeFile, "-p", stackName, "up", "-d"],
      { cwd: stackDir },
    );

    if (stackType === "studygate") {
      global.activeOperations.set(operationId, {
        id: operationId,
        status: "running",
        progress: 70,
        message: "Настраиваем Laravel для StudyGate...",
      });

      await waitForContainer(`${stackName}_php`, 45);

      try {
        await execPromise(`docker exec ${stackName}_php composer install`);
        await execPromise(
          `docker exec ${stackName}_php php artisan key:generate --force`,
        );
        await execPromise(
          `docker exec ${stackName}_php php artisan migrate --force`,
        );
        await execPromise(`docker exec ${stackName}_php php artisan db:seed`);
        await execPromise(
          `docker exec ${stackName}_php php artisan config:clear`,
        );
        await execPromise(
          `docker exec ${stackName}_php php artisan cache:clear`,
        );
        console.log("Laravel для StudyGate настроен");
      } catch (err) {
        console.log("Ошибка при настройке Laravel для StudyGate:", err.message);
      }
    }

    if (stackType === "stack") {
      global.activeOperations.set(operationId, {
        id: operationId,
        status: "running",
        progress: 60,
        message: "Ожидаем запуск Java приложения...",
      });

      await waitForContainer(`${stackName}_app`, 60);

      global.activeOperations.set(operationId, {
        id: operationId,
        status: "running",
        progress: 80,
        message: "Настраиваем фронтенд...",
      });

      const containerPorts = getContainerPorts(stackName);
      const frontendDir = path.join(stackDir, "frontend");

      if (fs.existsSync(frontendDir)) {
        function updateHtmlFiles(dir) {
          const files = fs.readdirSync(dir);
          files.forEach((file) => {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory()) {
              updateHtmlFiles(filePath);
            } else if (file.endsWith(".html")) {
              let html = fs.readFileSync(filePath, "utf8");
              html = html.replace(/\{\{APP_PORT\}\}/g, containerPorts.app);
              html = html.replace(
                /localhost:\{\{APP_PORT\}\}/g,
                `localhost:${containerPorts.app}`,
              );
              fs.writeFileSync(filePath, html);
            }
          });
        }

        updateHtmlFiles(frontendDir);
      }
    }

    if (stackType === "full") {
      global.activeOperations.set(operationId, {
        id: operationId,
        status: "running",
        progress: 70,
        message: "Ожидаем запуск PHP контейнера...",
      });

      await waitForContainer(`${stackName}_php`, 30);

      global.activeOperations.set(operationId, {
        id: operationId,
        status: "running",
        progress: 85,
        message: "Настраиваем Laravel (миграции)...",
      });

      try {
        await execPromise(
          `docker exec ${stackName}_php php artisan key:generate --force`,
        );
        await execPromise(
          `docker exec ${stackName}_php php artisan migrate --force`,
        );
        await execPromise(
          `docker exec ${stackName}_php php artisan config:clear`,
        );
        console.log("Все миграции настроены. Всё прошло успешно!");
      } catch (err) {
        console.log("Ошибка при настройке Laravel:", err.message);
      }
    }

    global.activeOperations.set(operationId, {
      id: operationId,
      status: "running",
      progress: 95,
      message: "Завершаем настройку...",
    });

    const finalContainerPorts = getContainerPorts(stackName);
    clearStackCache(stackName);

    const result = {
      success: true,
      message: `Стек ${stackType} запущен`,
      stackType,
      stackName,
      ports: finalContainerPorts,
      urls: {
        web: finalContainerPorts.web
          ? `http://localhost:${finalContainerPorts.web}`
          : null,
        api: finalContainerPorts.web
          ? `http://localhost:${finalContainerPorts.web}/api`
          : null,
        app: finalContainerPorts.app
          ? `http://localhost:${finalContainerPorts.app}`
          : null,
        appApi: finalContainerPorts.app
          ? `http://localhost:${finalContainerPorts.app}/api`
          : null,
        frontend: finalContainerPorts.frontend
          ? `http://localhost:${finalContainerPorts.frontend}`
          : null,
        phpmyadmin: finalContainerPorts.phpmyadmin
          ? `http://localhost:${finalContainerPorts.phpmyadmin}`
          : null,
      },
      portsInfo: {
        appPort: finalContainerPorts.app,
        webPort: finalContainerPorts.web,
        frontendPort: finalContainerPorts.frontend,
        phpmyadminPort: finalContainerPorts.phpmyadmin,
      },
    };

    console.log(
      `Результат стека "${stackName}":`,
      JSON.stringify(result, null, 2),
    );

    global.activeOperations.set(operationId, {
      id: operationId,
      status: "completed",
      progress: 100,
      message: "Стек успешно запущен!",
      result: result,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Ошибка:", err);
    global.activeOperations.set(operationId, {
      id: operationId,
      status: "failed",
      progress: 100,
      message: "Ошибка при создании стека",
      error: err.message,
      timestamp: new Date(),
    });
  } finally {
    resumeBackgroundUpdate();
    setTimeout(() => global.activeOperations.delete(operationId), 60000);
  }
}

async function deleteStackAsync(stackName, operationId) {
  const stackDir = path.join(global.STACKS_DIR, stackName);

  global.activeOperations.set(operationId, {
    id: operationId,
    status: "running",
    progress: 0,
    message: "Начинаем удаление стека...",
    timestamp: new Date(),
  });

  pauseBackgroundUpdate();
  try {
    global.activeOperations.set(operationId, {
      id: operationId,
      status: "running",
      progress: 30,
      message: "Останавливаем и удаляем контейнеры...",
    });

    const containers = execSync(
      `docker ps -a --filter "name=${stackName}" --format "{{.ID}}"`,
      { encoding: "utf8" },
    );
    const containerIds = containers
      .trim()
      .split("\n")
      .filter((id) => id)
      .join(" ");

    if (containerIds) {
      execSync(`docker rm -f ${containerIds}`, { stdio: "inherit" });
      console.log(`Контейнеры стека ${stackName} удалены`);
    }
    clearStackCache(stackName);

    global.activeOperations.set(operationId, {
      id: operationId,
      status: "running",
      progress: 70,
      message: "Удаляем папку стека...",
    });

    if (fs.existsSync(stackDir)) {
      fs.rmSync(stackDir, { recursive: true, force: true });
      console.log(`Папка стека ${stackName} удалена`);
    }

    global.activeOperations.set(operationId, {
      id: operationId,
      status: "completed",
      progress: 100,
      message: "Стек успешно удален",
      result: { success: true },
      timestamp: new Date(),
    });
  } catch (err) {
    console.error("Ошибка удаления:", err);
    global.activeOperations.set(operationId, {
      id: operationId,
      status: "failed",
      progress: 100,
      message: "Ошибка при удалении стека",
      error: err.message,
      timestamp: new Date(),
    });
  } finally {
    resumeBackgroundUpdate();
    setTimeout(() => global.activeOperations.delete(operationId), 30000);
  }
}

async function waitForContainer(containerName, maxAttempts = 30) {
  for (let i = 1; i <= maxAttempts; i++) {
    try {
      const { stdout } = await execPromise(
        `docker ps --filter "name=${containerName}" --format "{{.Status}}"`,
      );
      if (stdout.includes("Up") || stdout.includes("running")) {
        console.log(`Контейнер ${containerName} запущен (${i}/${maxAttempts})`);
        return true;
      }
    } catch (err) {
      /* ignore */
    }

    if (i === maxAttempts) {
      console.log(
        `Контейнер ${containerName} не запустился после ${maxAttempts} попыток`,
      );
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

module.exports = {
  getStacks,
  getContainerPorts,
  getDetailedContainerInfo,
  startStackAsync,
  deleteStackAsync,
  waitForContainer,
  clearStackCache,
};
