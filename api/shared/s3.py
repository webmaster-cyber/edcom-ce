import os
import glob
import stat
import shutil
import tempfile
from io import IOBase, BufferedReader
from typing import Any, List


class S3Object:

    def __init__(self, key: str, size: int) -> None:
        self.key = key
        self.size = size


def s3_size(bucket: str, key: str) -> int:
    return os.path.getsize(os.path.join(bucket, key))


def s3_list(bucket: str, prefix: str) -> List[S3Object]:
    bucketlen = len(bucket) + 1
    files = glob.glob(f"{bucket}/{prefix}**", recursive=True)

    files = [f for f in files if os.path.isfile(f)]

    stats = [os.stat(f) for f in files]

    return sorted(
        [
            S3Object(key=f[bucketlen:], size=s.st_size)
            for f, s in zip(files, stats)
            if stat.S_ISREG(s.st_mode)
        ],
        key=lambda x: x.key,
    )


def s3_delete(bucket: str, key: str) -> None:
    os.unlink(os.path.join(bucket, key))

    # don't prune empty directories as this causes a race condition when files are written / deleted at the same time
    # path = os.path.dirname(key)
    # while path:
    #    fullpath = os.path.join(bucket, path)
    #    if not len(os.listdir(fullpath)):
    #        os.rmdir(fullpath)
    #    path = os.path.dirname(path)


def s3_delete_all(bucket: str, before_ts: float) -> None:
    for root, _, files in os.walk(bucket):
        for file in files:
            file_path = os.path.join(root, file)
            if os.path.getmtime(file_path) < before_ts:
                os.unlink(file_path)


def s3_write(bucket: str, key: str, data: bytes) -> None:
    fd, temppath = tempfile.mkstemp()

    f = os.fdopen(fd, "w+b")
    f.write(data)
    f.close()

    topath = os.path.join(bucket, key)
    os.makedirs(os.path.dirname(topath), exist_ok=True)
    shutil.move(temppath, topath)
    os.chmod(topath, 0o644)


def s3_read(bucket: str, key: str) -> bytes:
    return open(os.path.join(bucket, key), "rb").read()


def s3_open_write(bucket: str, key: str) -> IOBase:
    return open(os.path.join(bucket, key), "wb")


def s3_read_range(bucket: str, key: str, start: int, length: int) -> bytes:
    fp = open(os.path.join(bucket, key), "rb")
    fp.seek(start, 0)
    data = fp.read(length)
    fp.close()
    return data


def s3_write_stream(bucket: str, key: str, stream: Any) -> None:
    fd, temppath = tempfile.mkstemp()
    f = os.fdopen(fd, "w+b")
    shutil.copyfileobj(stream, f)
    f.close()

    topath = os.path.join(bucket, key)
    os.makedirs(os.path.dirname(topath), exist_ok=True)
    shutil.move(temppath, topath)
    os.chmod(topath, 0o644)


def s3_read_stream(bucket: str, key: str) -> BufferedReader:
    return open(os.path.join(bucket, key), "rb")


def s3_copy(frombucket: str, fromkey: str, tobucket: str, tokey: str) -> None:
    frompath = os.path.join(frombucket, fromkey)
    topath = os.path.join(tobucket, tokey)
    os.makedirs(os.path.dirname(topath), exist_ok=True)
    shutil.copy(frompath, topath)
