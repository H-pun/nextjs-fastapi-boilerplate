from fastapi import Query
from typing import Annotated, Any, Generic, Literal, TypeVar, List
from pydantic import BaseModel, Field
from sqlalchemy import asc, desc
from sqlalchemy.orm import Query as SqlQuery
from fastapi import HTTPException

T = TypeVar("T", bound=BaseModel)

# Mirrors src/config/data-table.ts on the frontend. Kept as plain literals so a
# new operator on either side shows up as a validation error, not silent
# mis-filtering.
FilterOperator = Literal[
    "iLike", "notILike", "eq", "ne", "inArray", "notInArray",
    "isEmpty", "isNotEmpty", "lt", "lte", "gt", "gte",
    "isBetween", "isRelativeToToday",
]
FilterVariant = Literal[
    "text", "number", "range", "date", "dateRange",
    "boolean", "select", "multiSelect",
]


class FilterItem(BaseModel):
    """One condition from the data-table filter list."""

    id: str
    value: Any = None
    variant: FilterVariant = "text"
    operator: FilterOperator = "iLike"


class SortItem(BaseModel):
    id: str
    desc: bool = False


class FilterParams(BaseModel):
    # ge = greater than or equal to 1
    page: int = Field(1, ge=1)
    page_size: int = Field(100, ge=1)
    search: str | None = None
    order_by: str | None = None
    order_direction: Literal["asc", "desc"] = Field("asc", description="Sort direction: 'asc' or 'desc'")

    # Advanced filtering / multi-sort. Both arrive JSON-encoded because that is
    # how the data-table serialises them into the URL.
    filters: str | None = Field(
        None, description='JSON: [{"id","value","variant","operator"}]'
    )
    sort: str | None = Field(None, description='JSON: [{"id","desc"}]')
    join_operator: Literal["and", "or"] = "and"


class Pagination(BaseModel, Generic[T]):
    total_items: int
    total_pages: int
    page_size: int
    page: int
    items: List[T]

    @classmethod
    def from_query(cls, model: T, query: SqlQuery, filter: FilterParams) -> "Pagination[T]":
        if filter.order_by:
            orm_model = query.column_descriptions[0].get("entity")
            column = getattr(orm_model, filter.order_by, None)
            if column is None:
                raise HTTPException(status_code=400, detail=f"Invalid order_by field: {filter.order_by}")
            direction = desc if filter.order_direction == "desc" else asc
            query = query.order_by(direction(column))

        total = query.count()
        pages = (total + filter.page_size - 1) // filter.page_size if total > 0 else 1
        if filter.page > pages:
            raise HTTPException(status_code=400, detail="Page number exceeds total pages")
        data = query.offset((filter.page - 1) * filter.page_size).limit(filter.page_size).all()
        return cls(
            total_items=total, page=filter.page, page_size=filter.page_size, total_pages=pages,
            items=[model.model_validate(item) for item in data]
        )


FilterQuery = Annotated[FilterParams, Query()]
