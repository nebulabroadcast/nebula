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

FROM python:3.13-slim-trixie
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
COPY ./backend/pyproject.toml /backend/uv.lock .
RUN pip install --break-system-packages -e .  

COPY ./backend .
COPY --from=build /frontend/dist/ /frontend

CMD ["/bin/bash", "manage", "start"]
