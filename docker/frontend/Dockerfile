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
    echo 'echo "REACT_APP_API_URL: ${REACT_APP_API_URL}"' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '# Заменяем любой localhost:порт/api на правильный' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'if [ -n "${REACT_APP_API_URL}" ]; then' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '    echo "Replacing API URL with: ${REACT_APP_API_URL}"' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '    # Заменяем http://localhost:любой_порт/api' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '    find /app/build -name "*.js" -exec sed -i "s|http://localhost:[0-9]*/api|${REACT_APP_API_URL}|g" {} \;' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '    # Заменяем http://localhost:любой_порт' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '    find /app/build -name "*.js" -exec sed -i "s|http://localhost:[0-9]*|${REACT_APP_API_URL%/*}|g" {} \;' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'fi' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'serve -s build -l 3000' >> /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
