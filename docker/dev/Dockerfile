FROM node:22-bookworm-slim

COPY ./docker/dev/requirements.txt .

RUN apt-get update && apt-get install -y --no-install-recommends $(cat requirements.txt) \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 3000 9229

WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm config set fetch-retries 10 \
    && npm config set fetch-retry-factor 2 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-timeout 120000 \
    && npm ci --include=dev

COPY . .

COPY ./docker/dev/entrypoint.sh /tmp/entrypoint.sh
RUN chmod +x /tmp/entrypoint.sh

ENTRYPOINT [ "/usr/bin/tini", "--", "/bin/bash", "/tmp/entrypoint.sh" ]
