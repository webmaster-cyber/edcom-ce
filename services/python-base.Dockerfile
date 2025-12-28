FROM python:3.11.2-alpine

WORKDIR /

RUN apk add --no-cache postgresql-dev libffi-dev libxslt-dev logrotate gcc libc-dev

COPY config/pip.requirements /

RUN pip install --upgrade pip ; pip install -r /pip.requirements ; pip install gunicorn ; pip install watchdog
