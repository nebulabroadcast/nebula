IMAGE_NAME=nebulabroadcast/nebula-server:latest
VERSION=$(shell cd backend && poetry run python -c 'import nebula' --version)

check: check_version
	cd frontend && yarn format

	cd backend && \
		poetry run isort . && \
		poetry run black . && \
		poetry run flake8 . && \
		poetry run mypy .

check_version:
	echo $(VERSION)
	sed -i "s/^version = \".*\"/version = \"$(VERSION)\"/" backend/pyproject.toml

build:
	docker build -t $(IMAGE_NAME) .

dist: build
	docker push $(IMAGE_NAME)
