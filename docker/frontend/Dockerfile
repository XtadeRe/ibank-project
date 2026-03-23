FROM node:18-alpine

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build
RUN npm install -g serve

# Создаем entrypoint скрипт
RUN echo '#!/bin/sh' > /usr/local/bin/docker-entrypoint.sh && \
    echo 'set -e' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'echo "=== Starting frontend container ==="' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'echo "REACT_APP_API_URL: ${REACT_APP_API_URL}"' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '# Если переменная не задана, используем значение по умолчанию' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'if [ -z "${REACT_APP_API_URL}" ]; then' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '    echo "WARNING: REACT_APP_API_URL not set, using default"' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '    REACT_APP_API_URL="http://localhost:8000/api"' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'fi' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'echo "Replacing API URL with: ${REACT_APP_API_URL}"' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '# Заменяем URL в собранных файлах' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'for file in /app/build/static/js/*.js; do' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '    if [ -f "$file" ]; then' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '        echo "Processing: $file"' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '        sed -i "s|http://localhost:8000/api|${REACT_APP_API_URL}|g" "$file"' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '        sed -i "s|http://localhost:8000|${REACT_APP_API_URL%/*}|g" "$file"' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '    fi' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'done' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'echo "Starting serve on port 3000"' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'serve -s build -l 3000' >> /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
