IMAGE_NAME=nebulabroadcast/nebula-server:latest

test:
	cd frontend && yarn format

	cd backend && \
		poetry run isort . && \
		poetry run black . && \
		poetry run flake8 . && \
		poetry run mypy .

build:
	docker build -t $(IMAGE_NAME):latest .

dist: build
	docker push $(IMAGE_NAME):latest
