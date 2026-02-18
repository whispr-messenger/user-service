FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace

COPY ./docker/test/entrypoint.sh /tmp/entrypoint.sh
RUN chmod +x /tmp/entrypoint.sh

ENTRYPOINT [ "/usr/bin/tini", "--", "/bin/bash", "/tmp/entrypoint.sh" ]
