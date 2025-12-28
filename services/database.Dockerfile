FROM postgres:15.2-alpine

RUN apk --no-cache add pgbouncer

COPY ./config/pgbouncer.ini /etc/pgbouncer/pgbouncer.ini

ENV POSTGRES_USER edcom
ENV POSTGRES_PASSWORD edcom
ENV POSTGRES_DB edcom
VOLUME /docker-entrypoint-initdb.d

CMD su postgres -c 'pgbouncer -d /etc/pgbouncer/pgbouncer.ini' ; docker-entrypoint.sh postgres -c max_connections=1024 -c logging_collector=on -c log_destination=stderr -c log_directory=/logs/postgres -c log_rotation_age=7d