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

FROM python:3.13-slim-trixie
ENV PYTHONUNBUFFERED=1

EXPOSE 80
LABEL maintainer="github.com/nebulabroadcast"

RUN \
  apt-get update \
  && apt-get -yqq install \
  curl \
  cifs-utils \
  procps \
  ffmpeg \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /backend
COPY ./backend/pyproject.toml /backend/uv.lock .
RUN pip install --break-system-packages -e .  

COPY ./backend .
COPY --from=build /frontend/dist/ /frontend

CMD ["/bin/bash", "manage", "start"]
