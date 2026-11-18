FROM node:20-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends bzip2 libfontconfig1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 4004

CMD ["node", "index.js"]
