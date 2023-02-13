COMPOSE=$(shell which docker-compose || echo "docker compose")
IMAGE_NAME=nebulabroadcast/supernova
SERVER_CONTAINER=backend

.PHONY: build worker dist update

#
# Runtime
#

dbshell:
	@$(COMPOSE) exec postgres psql -U nebula nebula

setup:
	@$(COMPOSE) exec $(SERVER_CONTAINER) python -m setup
	@$(COMPOSE) exec $(SERVER_CONTAINER) ./manage reload

reload:
	@$(COMPOSE) exec $(SERVER_CONTAINER) ./manage reload

#
# Development
#

test:
	cd frontend && yarn format

	cd backend && \
		poetry run isort . && \
		poetry run black . && \
		poetry run flake8 . && \
		poetry run mypy .

build:
	docker build -t $(IMAGE_NAME):latest .

worker:
	cd worker && docker build -t $(IMAGE_NAME)-worker:latest .

dist: build
	docker push $(IMAGE_NAME):latest

update:
	docker pull $(IMAGE_NAME)
	$(COMPOSE) up --detach --build $(SERVER_CONTAINER)                                                  
tests:
	$(COMPOSE) exec $(SERVER_CONTAINER) poetry run pytest
