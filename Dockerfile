FROM node:alpine

RUN apk update
RUN apk add git
RUN apk add make
RUN apk add docker

WORKDIR /app

COPY src/package*.json ./
RUN npm install

COPY services.yml ./
COPY src/* ./

ENTRYPOINT [ "npm", "start", "--", "services.yml" ]