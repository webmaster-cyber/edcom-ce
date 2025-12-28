FROM node-base:latest

VOLUME /client/public
VOLUME /client/src
VOLUME /client/scripts

EXPOSE 3000

CMD npm start