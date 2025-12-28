FROM node:19.6-alpine

WORKDIR /client

COPY client/package.json /client
COPY client/package-lock.json /client

RUN npm install