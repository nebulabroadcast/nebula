#
# Build frontend
#

FROM node:25 AS build

WORKDIR /frontend

RUN rm -f /usr/local/bin/yarn /usr/local/bin/yarnpkg \
  && npm install -g corepack \
  && corepack enable

COPY ./frontend/index.html .
COPY ./frontend/package.json .
COPY ./frontend/vite.config.ts .
COPY ./frontend/tsconfig.json .
COPY ./frontend/tsconfig.app.json .
COPY ./frontend/tsconfig.node.json .
COPY ./frontend/yarn.lock .
COPY ./frontend/.yarnrc.yml .
COPY ./frontend/public /frontend/public

RUN yarn install --immutable
COPY ./frontend/src /frontend/src
RUN yarn build

FROM python:3.14-slim-trixie
ENV PYTHONUNBUFFERED=1

#
# Final image for running the server
#

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
COPY --from=ghcr.io/astral-sh/uv:0.9.8 /uv /bin/uv
COPY ./backend/pyproject.toml /backend/uv.lock .
# Dependencies only: the package's and the server group. The code runs
# from /backend, so the project itself (nebulabroadcast-core) isn't installed.
RUN uv pip install --system --break-system-packages -r pyproject.toml --group server

COPY ./backend .
COPY --from=build /frontend/dist/ /frontend

CMD ["/bin/bash", "manage", "start"]
