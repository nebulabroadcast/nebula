FROM node:latest AS build

RUN mkdir /frontend

COPY ./frontend/index.html /frontend/index.html
COPY ./frontend/package.json /frontend/package.json
COPY ./frontend/vite.config.js /frontend/vite.config.js
COPY ./frontend/src /frontend/src
COPY ./frontend/public /frontend/public

WORKDIR /frontend
RUN yarn install && yarn build

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
