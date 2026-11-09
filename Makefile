include .env
export

up:      ; docker compose up -d db redis minio
down:    ; docker compose down
migrate: ; migrate -path apps/api/db/migrations -database "$(DATABASE_URL)" up
api:     ; cd apps/api && go run ./cmd/api
web:     ; cd apps/web && pnpm dev
test:    ; cd apps/api && go test ./... && cd ../web && pnpm lint
