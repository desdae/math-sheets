FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY frontend/package.json frontend/package.json
COPY scripts/docker-dev-bootstrap.sh /usr/local/bin/docker-dev-bootstrap.sh

RUN chmod +x /usr/local/bin/docker-dev-bootstrap.sh
RUN npm install --workspace frontend

COPY frontend ./frontend

EXPOSE 5173

CMD ["sh", "-c", "/usr/local/bin/docker-dev-bootstrap.sh frontend npm run dev --workspace frontend -- --host 0.0.0.0 --port 5173"]
