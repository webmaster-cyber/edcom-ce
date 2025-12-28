FROM node-base:latest

VOLUME /client/public
VOLUME /client/src
VOLUME /client/build

CMD npm run build