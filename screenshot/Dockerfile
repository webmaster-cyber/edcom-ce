FROM zenika/alpine-chrome

WORKDIR /src/screenshot

USER root
RUN apk add --no-cache npm

COPY package.json package-lock.json /src/screenshot/

RUN npm install

COPY index.js /src/screenshot/

EXPOSE 4000

USER chrome

ENTRYPOINT [""]
CMD node index.js