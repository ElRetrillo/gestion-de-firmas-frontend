# Multi-stage Dockerfile para Frontend (React 19 + Vite 6 + Tailwind v4)
# Ilustre Municipalidad de Coquimbo
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
