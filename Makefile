IMAGE_NAME=nebulabroadcast/nebula-server:dev
VERSION=$(shell cd backend && uv run python -c 'import nebula' --version)

check:
	cd frontend && \
		yarn format

	cd backend && \
		sed -i "s/^version = \".*\"/version = \"$(VERSION)\"/" pyproject.toml && \
		uv run ruff format . && \
		uv run ruff check --fix . && \
		uv run mypy .

build:
	docker build -t $(IMAGE_NAME) .

dist: build
	docker push $(IMAGE_NAME)

setup-hooks:
	@echo "Setting up Git hooks..."
	@mkdir -p .git/hooks
	@echo '#!/bin/sh' > .git/hooks/pre-commit
	@echo 'cd "$$(git rev-parse --show-toplevel)"' >> .git/hooks/pre-commit
	@echo 'make check' >> .git/hooks/pre-commit
	@echo 'if [ $$? -ne 0 ]; then' >> .git/hooks/pre-commit
	@echo '  echo "Linting failed. Commit aborted."' >> .git/hooks/pre-commit
	@echo '  exit 1' >> .git/hooks/pre-commit
	@echo 'fi' >> .git/hooks/pre-commit
	@echo 'exit 0' >> .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
	@echo "Git hooks set up successfully."
