FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY src ./src
COPY data/.gitkeep ./data/

ENV NODE_ENV=production
ENV MEDIA_ROOT=/media
ENV STATE_FILE=/app/data/posted-state.json

VOLUME ["/media", "/app/data"]

CMD ["node", "src/index.js"]
