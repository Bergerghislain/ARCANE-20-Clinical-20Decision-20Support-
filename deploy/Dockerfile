# Image unique: build frontend Vite + API FastAPI qui sert dist/spa.
# Build depuis la racine du depot:
#   docker build -f deploy/Dockerfile -t arcane-app .

FROM node:22-bookworm-slim AS frontend
WORKDIR /build
RUN corepack enable pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm run build:client

FROM python:3.12-slim-bookworm
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
COPY backend_fastapi/requirements.txt ./backend_fastapi/requirements.txt
RUN pip install --no-cache-dir -r backend_fastapi/requirements.txt
COPY backend_fastapi ./backend_fastapi
COPY --from=frontend /build/dist/spa ./dist/spa
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "backend_fastapi.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
