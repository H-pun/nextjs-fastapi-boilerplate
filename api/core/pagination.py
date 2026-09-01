# helpers/pagination.py
import json
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException
from pydantic import BaseModel, ValidationError
from typing import Any, Dict, List, Optional, Sequence, TypeVar
from sqlalchemy import Date, DateTime, Select, and_, func, not_, or_, cast, String
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement
from sqlalchemy.sql import nulls_last

from api.schemas.pagination import FilterItem, FilterParams, Pagination, SortItem

T = TypeVar("T", bound=BaseModel)


# ==== Helper internal ====
def _build_search_filter(
    search: Optional[str],
    searchable: Sequence[ColumnElement[Any]],
    split_terms: bool = True,
) -> Optional[ColumnElement[bool]]:
    if not search or not searchable:
        return None
    text = search.strip()
    if not text:
        return None

    def col_like(col, term: str):
        return cast(col, String).ilike(f"%{term}%")

    if split_terms:
        terms = [t for t in text.split() if t]
        if not terms:
            return None
        from sqlalchemy import and_
        return and_(*[or_(*[col_like(c, t) for c in searchable]) for t in terms])
    else:
        return or_(*[col_like(c, text) for c in searchable])


# ==== Advanced filtering (data-table filter list) ====
def _parse_json_list(raw: Optional[str], model: type[BaseModel], label: str) -> list:
    """Decode one of the JSON-encoded query params into validated models."""
    if not raw:
        return []
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail=f"`{label}` is not valid JSON")
    if not isinstance(payload, list):
        raise HTTPException(status_code=400, detail=f"`{label}` must be a JSON array")
    try:
        return [model.model_validate(item) for item in payload]
    except ValidationError as e:
        raise HTTPException(status_code=400, detail=f"Invalid `{label}`: {e.errors()[0]['msg']}")


def _coerce(value: Any, item: FilterItem, col: ColumnElement[Any]) -> Any:
    """Turn a JSON filter value into something comparable to the column.

    Dates arrive as epoch milliseconds because that is what the date filter
    emits; numbers may arrive as strings from the text inputs.
    """
    if value is None:
        return None

    if item.variant in ("date", "dateRange"):
        try:
            moment = datetime.fromtimestamp(int(value) / 1000, tz=timezone.utc)
        except (TypeError, ValueError, OSError):
            raise HTTPException(
                status_code=400,
                detail=f"`{item.id}` expects a timestamp in milliseconds",
            )
        # Date columns compare against dates; DateTime columns keep the time.
        if isinstance(col.type, Date) and not isinstance(col.type, DateTime):
            return moment.date()
        return moment

    if item.variant in ("number", "range"):
        try:
            return Decimal(str(value))
        except (InvalidOperation, TypeError):
            raise HTTPException(
                status_code=400, detail=f"`{item.id}` expects a number"
            )

    if item.variant == "boolean":
        return str(value).lower() == "true"

    return value


def _as_pair(value: Any) -> tuple[Any, Any]:
    if not isinstance(value, (list, tuple)) or len(value) != 2:
        raise HTTPException(
            status_code=400, detail="`isBetween` expects a two-item value"
        )
    return value[0], value[1]


def _build_condition(
    col: ColumnElement[Any], item: FilterItem
) -> Optional[ColumnElement[bool]]:
    """Translate one filter item into a SQL condition.

    `ne` / `notILike` / `notInArray` deliberately match NULL rows too: a row
    with no value genuinely is "not X", and excluding it surprises people.
    """
    op = item.operator
    as_text = cast(col, String)

    if op == "isEmpty":
        return or_(col.is_(None), as_text == "")
    if op == "isNotEmpty":
        return and_(col.is_not(None), as_text != "")

    if op == "isRelativeToToday":
        # Declared in the shared config but never wired up in the filter UI, so
        # reaching this means a client made it up. Fail loudly.
        raise HTTPException(
            status_code=400, detail="`isRelativeToToday` is not supported"
        )

    if op in ("inArray", "notInArray"):
        values = item.value if isinstance(item.value, list) else [item.value]
        values = [_coerce(v, item, col) for v in values if v not in (None, "")]
        if not values:
            return None
        return col.in_(values) if op == "inArray" else or_(col.is_(None), col.notin_(values))

    if op == "isBetween":
        low, high = _as_pair(item.value)
        bounds = []
        if low not in (None, ""):
            bounds.append(col >= _coerce(low, item, col))
        if high not in (None, ""):
            bounds.append(col <= _coerce(high, item, col))
        return and_(*bounds) if bounds else None

    if item.value in (None, ""):
        return None

    if op == "iLike":
        return as_text.ilike(f"%{item.value}%")
    if op == "notILike":
        return or_(col.is_(None), not_(as_text.ilike(f"%{item.value}%")))

    value = _coerce(item.value, item, col)
    if op == "eq":
        return col == value
    if op == "ne":
        return or_(col.is_(None), col != value)
    if op == "lt":
        return col < value
    if op == "lte":
        return col <= value
    if op == "gt":
        return col > value
    if op == "gte":
        return col >= value

    return None


def _build_advanced_filters(
    filters: List[FilterItem],
    filter_map: Dict[str, ColumnElement[Any]],
    join_operator: str,
) -> Optional[ColumnElement[bool]]:
    conditions = []
    for item in filters:
        col = filter_map.get(item.id)
        if col is None:
            # Whitelist only — an unknown column name is a client bug, and
            # silently dropping it would return more rows than asked for.
            raise HTTPException(
                status_code=400, detail=f"`{item.id}` is not filterable"
            )
        condition = _build_condition(col, item)
        if condition is not None:
            conditions.append(condition)

    if not conditions:
        return None
    return and_(*conditions) if join_operator == "and" else or_(*conditions)


def _append_tiebreak(stmt: Select, base_stmt: Select) -> Select:
    """Append the keys that settle rows tying on the sort column.

    Rows that tie come back in whatever order the database feels like, and that
    order is free to differ between the query for page 1 and the query for page
    2 — so a row can show up twice, or never. Seeded data hits this constantly
    because a whole batch shares one `created_at`.

    Newest-written first where the entity records it, *then* the primary key.
    Ids are uuid4: breaking a tie on the key alone is a random order, which on a
    date-only record has no clock — so two entries on one day listed in neither
    the order they were
    written nor any other. `created_at` is not enough on its own (a seeded batch
    shares one), so the key still ends on the id, which is what makes the order
    total.
    """
    try:
        entity = base_stmt.column_descriptions[0]["entity"]
        pk = entity.__mapper__.primary_key[0]
    except (AttributeError, IndexError, KeyError, TypeError):
        return stmt
    if pk is None:
        return stmt

    created = entity.__mapper__.columns.get("created_at")
    if created is not None:
        stmt = stmt.order_by(created.desc())
    return stmt.order_by(pk)


def _apply_sorting(
    stmt: Select,
    filters: FilterParams,
    sort_map: Dict[str, ColumnElement[Any]],
    default_sort: Optional[ColumnElement[Any]],
) -> Select:
    """Multi-column when the client sends `sort`, else the legacy single
    `order_by`, else whatever the caller nominated as default."""
    sort_items: List[SortItem] = _parse_json_list(filters.sort, SortItem, "sort")

    if not sort_items:
        sort_col = sort_map.get(filters.order_by) if filters.order_by else None
        selected_sort = sort_col if sort_col is not None else default_sort
        return _apply_sort(stmt, selected_sort, filters.order_direction)

    for item in sort_items:
        col = sort_map.get(item.id)
        if col is None:
            raise HTTPException(status_code=400, detail=f"`{item.id}` is not sortable")
        stmt = _apply_sort(stmt, col, "desc" if item.desc else "asc")
    return stmt


def _apply_sort(
    stmt: Select,
    sort_col: Optional[ColumnElement[Any]],
    direction: str,
) -> Select:
    # SQLAlchemy column expressions deliberately do not define truthiness.
    # `if not sort_col` raises "Boolean value of this clause is not defined"
    # as soon as the client requests a real sort column.
    if sort_col is None:
        return stmt
    order_expr = sort_col.asc() if direction == "asc" else sort_col.desc()
    try:
        order_expr = nulls_last(order_expr)
    except Exception:
        pass
    return stmt.order_by(order_expr)

# ==== Fungsi utama ====


def narrow_select(
    base_stmt: Select,
    *,
    filters: FilterParams,
    searchable: Sequence[ColumnElement[Any]] = (),
    filter_map: Dict[str, ColumnElement[Any]] = {},
) -> Select:
    """Search and advanced filters applied, without sorting or paging.

    Split out of `paginate_select` so a total can be taken over exactly the rows
    a page is showing. Computing it from its own copy of these conditions is how
    a summary ends up disagreeing with the table under it.
    """
    search_filter = _build_search_filter(filters.search, searchable)
    working = base_stmt.where(search_filter) if search_filter is not None else base_stmt

    # whitelist only: an id that is not in the map is a 400, never a silent
    # no-op — dropping it would answer with more rows than were asked for.
    advanced = _build_advanced_filters(
        _parse_json_list(filters.filters, FilterItem, "filters"),
        filter_map,
        filters.join_operator,
    )
    return working.where(advanced) if advanced is not None else working


def paginate_select(
    session: Session,
    base_stmt: Select,
    *,
    filters: FilterParams,
    # list kolom yang boleh ikut search
    searchable: Sequence[ColumnElement[Any]] = (),
    # peta nama sort -> kolom (harus di-whitelist)
    sort_map: Dict[str, ColumnElement[Any]] = {},
    # peta nama kolom -> kolom untuk advanced filter (harus di-whitelist)
    filter_map: Dict[str, ColumnElement[Any]] = {},
    # fallback sort bila order_by kosong/tidak valid
    default_sort: Optional[ColumnElement[Any]] = None,
) -> Pagination[Any]:
    """
    NOTE:
    - Jika perlu sort/search pada kolom relasi, pastikan base_stmt SUDAH .join() ke tabel terkait.
    - `filters.filters` / `filters.sort` (JSON) berasal dari data-table; keduanya
      opsional, jadi caller lama yang hanya pakai search + order_by tetap jalan.
    """

    # 1-2) search + advanced filters
    working = narrow_select(
        base_stmt, filters=filters, searchable=searchable, filter_map=filter_map
    )

    # 3) sort — always ends with the primary key so paging stays stable
    working = _append_tiebreak(
        _apply_sorting(working, filters, sort_map, default_sort), base_stmt
    )

    # 4) total count via subquery (hapus ORDER BY agar efisien/valid)
    count_stmt = func.count().select().select_from(working.order_by(None).subquery())
    total_items = session.execute(count_stmt).scalar_one()

    total_pages = (total_items + filters.page_size - 1) // filters.page_size if total_items > 0 else 1
    if filters.page > total_pages:
        raise HTTPException(status_code=400, detail="Page number exceeds total pages")

    # 4) paging
    offset = (filters.page - 1) * filters.page_size
    page_stmt = working.limit(filters.page_size).offset(offset)
    result = session.execute(page_stmt)

    # 5) ambil items (scalars jika select(ORMClass))
    try:
        items = result.scalars().all()
    except Exception:
        items = result.all()

    return Pagination[Any](
        total_items=total_items,
        total_pages=total_pages,
        page_size=filters.page_size,
        page=filters.page,
        items=items,
    )
