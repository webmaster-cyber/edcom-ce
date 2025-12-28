import os
from typing import List
from .s3 import s3_read, s3_list, S3Object

bucket = os.environ["s3_blockbucket"]


def read_block(path: str) -> bytes | None:
    try:
        r = s3_read(bucket, path)
    except:
        return None
    if not len(r):
        return None
    return r


def list_blocks(path: str) -> List[S3Object]:
    return s3_list(bucket, path)
