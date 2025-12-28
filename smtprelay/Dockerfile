FROM golang:1.20.1-alpine3.17

WORKDIR /src/smtprelay

RUN apk add --no-cache git

COPY go.mod go.sum /src/smtprelay/

RUN go mod download

COPY *.go /src/smtprelay/

COPY smtpd/*.go /src/smtprelay/smtpd/

RUN go build smtprelay

FROM alpine:3.17

RUN apk add --no-cache ca-certificates tzdata

COPY --from=0 /src/smtprelay/smtprelay /usr/bin

ENV TZ=America/Los_Angeles

RUN cp /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

EXPOSE 587 2525 8025

VOLUME /cert

ENV edcomhost=api:8000

ENTRYPOINT ["/usr/bin/smtprelay"]