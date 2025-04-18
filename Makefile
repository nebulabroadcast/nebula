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
	@echo '#!/bin/sh\n\n# Navigate to the repository root directory\ncd "$$(git rev-parse --show-toplevel)"\n\n# Execute the linting command from the Makefile\nmake check\n\n# Check the return code of the make command\nif [ $$? -ne 0 ]; then\n  echo "Linting failed. Commit aborted."\n  exit 1\nfi\n\n# If everything is fine, allow the commit\nexit 0' > .git/hooks/pre-commit
	@chmod +x .git/hooks/pre-commit
	@echo "Git hooks set up successfully."
