compose_file := "apps/api/docker-compose.local.yml"

up:
    @echo "Starting containers..."
    docker-compose -f {{compose_file}} up -d
    @echo "Containers started successfully!"

down:
    @echo "Stopping containers..."
    docker-compose -f {{compose_file}} down
    @echo "Containers stopped successfully!"

refresh:
    @echo "Removing containers and volumes..."
    docker-compose -f {{compose_file}} down -v --remove-orphans
    @echo "Starting fresh containers..."
    docker-compose -f {{compose_file}} up -d
    @echo "Waiting for PostgreSQL to be ready..."
    until docker exec resend-incidents-postgres pg_isready -U resend_incidents -q; do sleep 1; done
    @echo "Apply migrations..."
    bun run --filter @resend-incidents/api db:migrate
    @echo "Done!"

logs:
    docker-compose -f {{compose_file}} logs -f
