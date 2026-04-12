FROM node:24-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json

RUN npm install --workspace backend

COPY backend ./backend
COPY database ./database

EXPOSE 3000

CMD ["sh", "-c", "npm run migrate --workspace backend && npm run seed --workspace backend && npm run dev --workspace backend"]
