import logging
import sys
import os
from logging.handlers import WatchedFileHandler
from celery.utils.log import get_task_logger

# make sure configuration file is loaded first
from . import config  # noqa: F401

FORMAT = "%(asctime)s.%(msecs)03d %(levelname)s [%(process)d] %(module)s.%(funcName)s:%(lineno)d: %(message)s"
DATEFMT = "%Y-%m-%d %H:%M:%S"
NAME = "edcom"
FILENAME = "/logs/app.log"
LEVEL = logging.INFO
if bool(os.environ.get("debug", False)):
    LEVEL = logging.DEBUG

root_logger = logging.getLogger()
root_logger.handlers.clear()

formatter = logging.Formatter(FORMAT, DATEFMT)

fileHandler = WatchedFileHandler(FILENAME)
streamHandler = logging.StreamHandler(sys.stdout)

fileHandler.setFormatter(formatter)
streamHandler.setFormatter(formatter)

root_logger.addHandler(fileHandler)
root_logger.addHandler(streamHandler)

logging.getLogger(NAME).setLevel(LEVEL)

is_celery = bool(os.environ.get("celery_worker", False))


def get_logger() -> logging.Logger:
    if is_celery:
        return get_task_logger(NAME)
    else:
        return logging.getLogger(NAME)


def get_root_logger() -> logging.Logger:
    return logging.getLogger(NAME)
