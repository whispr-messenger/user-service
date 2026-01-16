default:
    just --list

up ENV:
    #!/bin/bash
    if [ "{{ENV}}" = "dev" ]; then
        docker compose -f docker/dev/compose.yml up -d --build
    elif [ "{{ENV}}" = "prod" ]; then
        docker compose -f docker/prod/compose.yml up --detach --build
    elif [ "{{ENV}}" = "doc" ]; then
        docker compose -f docker/doc/compose.yml up --detach
    else
        echo "{{ENV}}: Accepted values are 'dev', 'prod' or 'doc'." >&2
    fi

down ENV:
    #!/bin/bash
    if [ "{{ENV}}" = "dev" ]; then
        docker compose -f docker/dev/compose.yml down --volumes
    elif [ "{{ENV}}" = "prod" ]; then
        docker compose -f docker/prod/compose.yml down --volumes
    elif [ "{{ENV}}" = "doc" ]; then
        docker compose -f docker/doc/compose.yml up --detach
    else
        echo "{{ENV}}: Accepted values are 'dev', 'prod' or 'doc'." >&2
    fi

logs ENV:
    #!/bin/bash
    if [ "{{ENV}}" = "dev" ]; then
        docker compose -f docker/{{ENV}}/compose.yml logs --follow
    elif [ "{{ENV}}" = "prod" ]; then
        docker compose -f docker/{{ENV}}/compose.yml logs --follow
    else
        echo "{{ENV}}: Accepted values are 'dev' or 'prod'." >&2
    fi


shell:
    docker compose -f docker/dev/compose.yml exec -it user-service bash

test:
    docker compose -f docker/dev/compose.yml exec -it user-service npm run test