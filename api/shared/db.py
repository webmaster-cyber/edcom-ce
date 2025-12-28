import psycopg2
import psycopg2.pool
import psycopg2.extras
import psycopg2.extensions
import shortuuid
import os
from typing import (
    Dict,
    Iterator,
    Generator,
    Any,
    Tuple,
    TypeAlias,
    List,
    overload,
    Literal,
    cast,
)
from contextlib import contextmanager
from .log import get_logger

log = get_logger()

DEC2FLOAT = psycopg2.extensions.new_type(
    psycopg2.extensions.DECIMAL.values,
    "DEC2FLOAT",
    lambda value, curs: float(value) if value is not None else None,
)
psycopg2.extensions.register_type(DEC2FLOAT)
psycopg2.extensions.register_adapter(dict, psycopg2.extras.Json)


JsonObj: TypeAlias = Dict[str, Any]


@overload
def json_obj(row: None) -> None: ...
@overload
def json_obj(row: Tuple[str, str, JsonObj]) -> JsonObj: ...


def json_obj(row: Tuple[str, str, JsonObj] | None) -> JsonObj | None:
    if row is None:
        return None
    id, cid, data = row
    data["id"] = id
    data["cid"] = cid
    return data


@overload
def statlogs_obj(row: None) -> None: ...


@overload
def statlogs_obj(
    row: Tuple[
        str,
        str,
        str,
        str,
        str,
        int,
        int,
        int,
        int,
        str,
        str,
        int,
        str,
        str,
        str,
    ]
) -> JsonObj: ...


def statlogs_obj(
    row: (
        Tuple[
            str,
            str,
            str,
            str,
            str,
            int,
            int,
            int,
            int,
            str,
            str,
            int,
            str,
            str,
            str,
        ]
        | None
    )
) -> JsonObj | None:
    if row is None:
        return None
    (
        id,
        cid,
        ip,
        ts,
        err,
        hard,
        send,
        soft,
        count,
        lastts,
        sinkid,
        deferlen,
        defermsg,
        settingsid,
        domaingroupid,
    ) = row
    data: JsonObj = {}
    data["id"] = id
    data["cid"] = cid
    data["ip"] = ip
    data["ts"] = ts
    data["err"] = err
    data["hard"] = hard
    data["send"] = send
    data["soft"] = soft
    data["count"] = count
    data["lastts"] = lastts
    data["sinkid"] = sinkid
    data["deferlen"] = deferlen
    data["defermsg"] = defermsg
    data["settingsid"] = settingsid
    data["domaingroupid"] = domaingroupid
    return data


def json_iter(i: Iterator[Tuple[str, str, JsonObj]]) -> Generator[JsonObj, None, None]:
    for row in i:
        yield json_obj(row)


def statlogs_iter(
    i: Iterator[
        Tuple[
            str,
            str,
            str,
            str,
            str,
            int,
            int,
            int,
            int,
            str,
            str,
            int,
            str,
            str,
            str,
        ]
    ]
) -> Generator[JsonObj, None, None]:
    for row in i:
        yield statlogs_obj(row)


class JSONWrapper(object):

    def __init__(self, c: "DB", cid: str | None, name: str) -> None:
        self.conn = c
        self.cid = cid
        self.name = name

    def find_one(self, obj: JsonObj) -> JsonObj | None:
        if self.cid is not None:
            q = (
                "select id, cid, data from %s where cid = %%s and data @> %%s"
                % self.name
            )
            return json_obj(self.conn.row(q, self.cid, obj))
        else:
            q = "select id, cid, data from %s where data @> %%s" % self.name
            return json_obj(self.conn.row(q, obj))

    def count(
        self,
        obj: JsonObj | None = None,
        limit: int | None = None,
        offset: int | None = None,
    ) -> int:
        return self._find_or_count(False, obj, limit=limit, offset=offset)

    def find(
        self,
        obj: JsonObj | None = None,
        limit: int | None = None,
        offset: int | None = None,
        sort: List[Tuple[str, str]] | None = None,
    ) -> Iterator[JsonObj]:
        return self._find_or_count(True, obj, limit=limit, offset=offset, sort=sort)

    @overload
    def _find_or_count(
        self,
        find: Literal[True],
        obj: JsonObj | None,
        limit: int | None = None,
        offset: int | None = None,
        sort: List[Tuple[str, str]] | None = None,
    ) -> Iterator[JsonObj]: ...

    @overload
    def _find_or_count(
        self,
        find: Literal[False],
        obj: JsonObj | None,
        limit: int | None = None,
        offset: int | None = None,
        sort: List[Tuple[str, str]] | None = None,
    ) -> int: ...

    def _find_or_count(
        self,
        find: bool,
        obj: JsonObj | None,
        limit: int | None = None,
        offset: int | None = None,
        sort: List[Tuple[str, str]] | None = None,
    ) -> Iterator[JsonObj] | int:
        if obj is None:
            obj = {}

        sort_str = ""
        if sort:
            sort_str = " order by %s" % ", ".join("data->>'%s' %s" % s for s in sort)
        limit_str = ""
        if limit is not None:
            limit_str = " limit %s" % limit
        offset_str = ""
        if offset is not None:
            offset_str = " offset %s" % offset
        if find:
            if self.cid is not None:
                q = (
                    "select id, cid, data from %s where cid = %%s and data @> %%s%s%s%s"
                    % (self.name, sort_str, limit_str, offset_str)
                )
                return json_iter(self.conn.execute(q, self.cid, obj))
            else:
                q = "select id, cid, data from %s where data @> %%s%s%s%s" % (
                    self.name,
                    sort_str,
                    limit_str,
                    offset_str,
                )
                return json_iter(self.conn.execute(q, obj))
        else:
            if self.cid is not None:
                q = "select count(id) from %s where cid = %%s and data @> %%s%s%s" % (
                    self.name,
                    limit_str,
                    offset_str,
                )
                return cast(int, self.conn.single(q, self.cid, obj))
            else:
                q = "select count(id) from %s where data @> %%s%s%s" % (
                    self.name,
                    limit_str,
                    offset_str,
                )
                return cast(int, self.conn.single(q, obj))

    def delete(self, obj: JsonObj) -> int:
        if self.cid is not None:
            q = "delete from %s where cid = %%s and data @> %%s" % self.name
            return self.conn.execute(q, self.cid, obj).rowcount
        else:
            q = "delete from %s where data @> %%s" % self.name
            return self.conn.execute(q, obj).rowcount

    def update(self, obj: JsonObj, upd: JsonObj) -> int:
        upd.pop("id", None)
        upd.pop("cid", None)

        if self.cid is not None:
            q = (
                "update %s set data = data || %%s where cid = %%s amd data @> %%s"
                % self.name
            )
            return self.conn.execute(q, upd, self.cid, obj).rowcount
        else:
            q = "update %s set data = data || %%s where data @> %%s" % self.name
            return self.conn.execute(q, upd, obj).rowcount

    def get_singleton(self) -> JsonObj:
        for i in self.find({}, limit=1):
            return i
        ret = self.get(self.add({}))
        if ret is None:
            raise ValueError("Failed to create singleton")
        return ret

    def patch_singleton(self, obj: JsonObj) -> None:
        for i in self.find({}, limit=1):
            self.patch(i["id"], obj)
            return
        self.add(obj)

    def get(self, id: str) -> JsonObj | None:
        if self.cid is not None:
            q = "select id, cid, data from %s where id = %%s and cid = %%s" % self.name
            return json_obj(self.conn.row(q, id, self.cid))
        else:
            q = "select id, cid, data from %s where id = %%s" % self.name
            return json_obj(self.conn.row(q, id))

    def get_all(self) -> List[JsonObj]:
        if self.cid is not None:
            return list(
                json_iter(
                    self.conn.execute(
                        "select id, cid, data from %s where cid = %%s" % self.name,
                        self.cid,
                    )
                )
            )
        else:
            return list(
                json_iter(self.conn.execute("select id, cid, data from %s" % self.name))
            )

    def patch(self, id: str, obj: JsonObj) -> int:
        obj.pop("id", None)
        obj.pop("cid", None)
        if self.cid is not None:
            q = (
                "update %s set data = data || %%s where id = %%s and cid = %%s"
                % self.name
            )
            return self.conn.execute(q, obj, id, self.cid).rowcount
        else:
            q = "update %s set data = data || %%s where id = %%s" % self.name
            return self.conn.execute(q, obj, id).rowcount

    def add(self, obj: JsonObj) -> str:
        obj.pop("id", None)
        obj.pop("cid", None)
        id = shortuuid.uuid()
        if self.cid is not None:
            q = "insert into %s (id, cid, data) values (%%s, %%s, %%s)" % self.name
            self.conn.execute(q, id, self.cid, obj)
        else:
            q = "insert into %s (id, data) values (%%s, %%s)" % self.name
            self.conn.execute(q, id, obj)
        return id

    def remove(self, id: str) -> int:
        if self.cid is not None:
            q = "delete from %s where id = %%s and cid = %%s" % self.name
            return self.conn.execute(q, id, self.cid).rowcount
        else:
            q = "delete from %s where id = %%s" % self.name
            return self.conn.execute(q, id).rowcount


_pools = {}


class DB(object):

    def __init__(self) -> None:
        self.cid: str | None = None
        self.cur: psycopg2.extensions.cursor | None = None
        self.conn = None
        self._trace = bool(os.environ.get("sql_trace", False))
        pid = os.getpid()
        if pid not in _pools:
            _pools[pid] = psycopg2.pool.SimpleConnectionPool(
                1, 50000, os.environ["postgres_conn"]
            )
        self.conn = _pools[pid].getconn()
        self.conn.autocommit = True
        self.cur = self.conn.cursor()

    def close(self) -> None:
        if self.cur is not None:
            self.cur.close()
            self.cur = None
        if self.conn is not None:
            pid = os.getpid()
            _pools[pid].putconn(self.conn)
            self.conn = None

    def __del__(self) -> None:
        self.close()

    def set_cid(self, cid: str | None) -> None:
        self.cid = cid

    def get_cid(self) -> str | None:
        return self.cid

    @contextmanager
    def trace(self) -> Generator[None, None, None]:
        oldvalue = self._trace
        self._trace = True
        try:
            yield
        finally:
            self._trace = oldvalue

    @contextmanager
    def transaction(self) -> Generator[None, None, None]:
        if self.cur is not None:
            self.cur.close()
            self.cur = None
        if self.conn is not None:
            self.conn.rollback()
            self.conn.autocommit = False
        self.cur = self.conn.cursor()
        try:
            yield
            if self.conn is not None:
                self.conn.commit()
        except:
            if self.conn is not None:
                self.conn.rollback()
            raise
        finally:
            if self.cur is not None:
                self.cur.close()
                self.cur = None
            self.conn.autocommit = True
            self.cur = self.conn.cursor()

    def __getattr__(self, name: str) -> JSONWrapper:
        return JSONWrapper(self, self.cid, name)

    def __getitem__(self, key: str) -> JSONWrapper:
        return JSONWrapper(self, self.cid, key)

    def execute(self, sql: str, *vals: Any, **dvals: Any) -> psycopg2.extensions.cursor:
        if self.cur is None:
            raise Exception("Database connection not open")

        if len(vals):
            if self._trace:
                log.info(self.cur.mogrify(sql, vals).decode("utf-8"))
            self.cur.execute(sql, vals)
        else:
            if self._trace:
                log.info(self.cur.mogrify(sql, dvals).decode("utf-8"))
            self.cur.execute(sql, dvals)
        return self.cur

    def single(self, sql: str, *vals: Any, **dvals: Any) -> Any:
        if self.cur is None:
            raise Exception("Database connection not open")

        self.execute(sql, *vals, **dvals)
        r = self.cur.fetchone()
        if r is None:
            return None
        return r[0]

    def row(self, sql: str, *vals: Any, **dvals: Any) -> Tuple[Any, ...] | None:
        if self.cur is None:
            raise Exception("Database connection not open")

        self.execute(sql, *vals, **dvals)
        r = self.cur.fetchone()
        if r is None:
            return None
        return r

    def row_or_error(self, sql: str, *vals: Any, **dvals: Any) -> Tuple[Any, ...]:
        r = self.row(sql, *vals, **dvals)
        if r is None:
            raise ValueError("Query did not return any rows")
        return r


@contextmanager
def open_db() -> Generator[DB, None, None]:
    db = DB()
    try:
        yield db
    finally:
        db.close()
