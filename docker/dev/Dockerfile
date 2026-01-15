FROM node:22-bookworm-slim

COPY ./docker/dev/requirements.txt .

RUN apt-get update && apt-get install -y $(cat requirements.txt) \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 3000 9229

WORKDIR /workspace

COPY ./docker/dev/entrypoint.sh /tmp/entrypoint.sh
RUN chmod +x /tmp/entrypoint.sh

ENTRYPOINT [ "/usr/bin/tini", "--", "/bin/bash", "/tmp/entrypoint.sh" ]
