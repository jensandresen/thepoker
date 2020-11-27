FROM node:alpine

RUN apk update
RUN apk add curl bash git

WORKDIR /app

COPY src /app
RUN chmod +x app.sh

RUN mkdir /data
ENV DATA_DIR=/data
ENV PULL_INTERVAL=5
ENV INFRASTRUCTURE_REPOSITORY=https://github.com/jensandresen/homeportal-infrastructure.git

ENTRYPOINT [ "bash", "./app.sh" ]