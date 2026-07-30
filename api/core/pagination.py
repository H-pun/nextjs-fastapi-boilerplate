# helpers/pagination.py
from pydantic import BaseModel
from typing import Any, Dict, Optional, Sequence, TypeVar
from sqlalchemy import Select, func, or_, cast, String
from sqlalchemy.orm import Session
from sqlalchemy.sql.elements import ColumnElement
from sqlalchemy.sql import nulls_last

from api.schemas.pagination import FilterParams, Pagination

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


def _apply_sort(
    stmt: Select,
    sort_col: Optional[ColumnElement[Any]],
    direction: str,
) -> Select:
    if not sort_col:
        return stmt
    order_expr = sort_col.asc() if direction == "asc" else sort_col.desc()
    try:
        order_expr = nulls_last(order_expr)
    except Exception:
        pass
    return stmt.order_by(order_expr)

# ==== Fungsi utama ====


def paginate_select(
    session: Session,
    base_stmt: Select,
    *,
    filters: FilterParams,
    # list kolom yang boleh ikut search
    searchable: Sequence[ColumnElement[Any]] = (),
    # peta nama sort -> kolom (harus di-whitelist)
    sort_map: Dict[str, ColumnElement[Any]] = {},
    # fallback sort bila order_by kosong/tidak valid
    default_sort: Optional[ColumnElement[Any]] = None,
) -> Pagination[Any]:
    """
    NOTE:
    - Jika perlu sort/search pada kolom relasi, pastikan base_stmt SUDAH .join() ke tabel terkait.
    """

    # 1) search
    search_filter = _build_search_filter(filters.search, searchable)
    working = base_stmt.where(search_filter) if search_filter is not None else base_stmt

    # 2) sort (whitelist only)
    sort_col = None
    if filters.order_by:
        sort_col = sort_map.get(filters.order_by)
    if sort_col is None:
        sort_col = default_sort
    working = _apply_sort(working, sort_col, filters.order_direction)

    # 3) total count via subquery (hapus ORDER BY agar efisien/valid)
    count_stmt = func.count().select().select_from(working.order_by(None).subquery())
    total_items = session.execute(count_stmt).scalar_one()

    # 4) paging
    offset = (filters.page - 1) * filters.page_size
    page_stmt = working.limit(filters.page_size).offset(offset)
    result = session.execute(page_stmt)

    # 5) ambil items (scalars jika select(ORMClass))
    try:
        items = result.scalars().all()
    except Exception:
        items = result.all()

    total_pages = (total_items + filters.page_size - 1) // filters.page_size if filters.page_size else 1

    return Pagination[Any](
        total_items=total_items,
        total_pages=total_pages,
        page_size=filters.page_size,
        page=filters.page,
        items=items,
    )
