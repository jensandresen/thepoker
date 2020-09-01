FROM python:3.8.5-alpine

RUN apk update
RUN apk add git
RUN apk add make
RUN apk add docker

WORKDIR /app

COPY src/requirements.txt ./
RUN pip install -r requirements.txt

COPY ./services.yml  ./

COPY src/* ./

ENTRYPOINT [ "python", "app.py", "services.yml" ]