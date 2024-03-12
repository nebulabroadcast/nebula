IMAGE_NAME=nebulabroadcast/nebula-server:dev
VERSION=$(shell cd backend && poetry run python -c 'import nebula' --version)

check: check_version
	cd frontend && yarn format

	cd backend && \
		poetry run ruff format . && \
		poetry run ruff check --fix . && \
		poetry run mypy .

check_version:
	cd backend && poetry version $(VERSION)

build:
	docker build -t $(IMAGE_NAME) .

dist: build
	docker push $(IMAGE_NAME)
