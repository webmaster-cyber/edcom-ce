FROM golang:1.20.1-alpine3.17

WORKDIR /src/velocity

RUN apk add --no-cache git

COPY go.mod go.sum /src/velocity/

RUN go mod download

COPY *.go /src/velocity/

COPY sender/*.go /src/velocity/sender/

RUN go build velocity

FROM alpine:3.17

RUN apk add --no-cache ca-certificates tzdata

COPY --from=0 /src/velocity/velocity /usr/bin

ENV TZ=America/Los_Angeles

RUN cp /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

EXPOSE 25 80 81

VOLUME /logs /mail /conf

ENTRYPOINT ["/usr/bin/velocity"]
