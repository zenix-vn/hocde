include .env
export

up:      ; docker compose up -d db redis minio
down:    ; docker compose down
migrate: ; migrate -path apps/api/db/migrations -database "$(DATABASE_URL)" up
api:     ; cd apps/api && go run ./cmd/api
web:     ; cd apps/web && pnpm dev
content-validate: ; cd apps/api && go run ./cmd/contentimport -validate $(addprefix ../../,$(dir $(wildcard content/*/*/_course.yaml)))
content-import:   ; cd apps/api && go run ./cmd/contentimport $(addprefix ../../,$(dir $(wildcard content/*/*/_course.yaml)))
test:    ; cd apps/api && go test ./... && cd ../web && pnpm lint
