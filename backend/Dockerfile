FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY scripts/docker-dev-bootstrap.sh /usr/local/bin/docker-dev-bootstrap.sh

RUN chmod +x /usr/local/bin/docker-dev-bootstrap.sh
RUN npm install --workspace backend

COPY backend ./backend
COPY database ./database

EXPOSE 3000

CMD ["sh", "-c", "/usr/local/bin/docker-dev-bootstrap.sh backend sh -c 'npm run migrate --workspace backend && npm run seed --workspace backend && npm run dev --workspace backend'"]
