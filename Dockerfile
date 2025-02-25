FROM node:latest AS build

WORKDIR /frontend

COPY ./frontend/index.html .
COPY ./frontend/package.json .
COPY ./frontend/vite.config.ts .
COPY ./frontend/tsconfig.json .
COPY ./frontend/tsconfig.node.json .
COPY ./frontend/public /frontend/public

RUN yarn install
COPY ./frontend/src /frontend/src
RUN yarn build

FROM python:3.12-slim
ENV PYTHONBUFFERED=1

RUN \
  apt-get update \
  && apt-get -yqq install \
  curl \
  cifs-utils \
  procps \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /backend
COPY ./backend/pyproject.toml /backend/uv.lock .
RUN --mount=from=ghcr.io/astral-sh/uv,source=/uv,target=/bin/uv \
    uv pip install -r pyproject.toml --system

COPY ./backend .
COPY --from=build /frontend/dist/ /frontend

CMD ["/bin/bash", "manage", "start"]
