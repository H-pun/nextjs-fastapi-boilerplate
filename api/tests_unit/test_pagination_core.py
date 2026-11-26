from datetime import datetime, timezone
from decimal import Decimal

import pytest
from fastapi import HTTPException
from sqlalchemy import DateTime, Integer, Numeric, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

from api.core.pagination import paginate_select
from api.schemas.pagination import FilterParams


class Base(DeclarativeBase):
    pass


class Item(Base):
    __tablename__ = "pagination_test_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str | None] = mapped_column(String, nullable=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


@pytest.fixture()
def session():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add_all(
            [
                Item(
                    id=1,
                    name="Alpha",
                    amount=Decimal("100.00"),
                    created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
                ),
                Item(
                    id=2,
                    name="Beta",
                    amount=Decimal("250.00"),
                    created_at=datetime(2026, 1, 2, tzinfo=timezone.utc),
                ),
                Item(
                    id=3,
                    name=None,
                    amount=Decimal("500.00"),
                    created_at=datetime(2026, 1, 3, tzinfo=timezone.utc),
                ),
            ]
        )
        db.commit()
        yield db


def paginate(session: Session, filters: FilterParams):
    return paginate_select(
        session,
        select(Item),
        filters=filters,
        searchable=[Item.name],
        sort_map={"name": Item.name, "amount": Item.amount},
        filter_map={"name": Item.name, "amount": Item.amount},
        group_map={"name": Item.name, "amount": Item.amount},
        default_sort=Item.name,
    )


def test_group_by_returns_summaries_and_orders_rows(session: Session):
    session.add(
        Item(
            id=4,
            name="Alpha",
            amount=Decimal("150.00"),
            created_at=datetime(2026, 1, 4, tzinfo=timezone.utc),
        )
    )
    session.commit()

    result = paginate(session, FilterParams(group_by="name"))

    assert result.group_by == "name"
    assert result.groups is not None
    assert {group.id for group in result.groups} == {
        "__empty__",
        "Alpha",
        "Beta",
    }
    assert next(group for group in result.groups if group.id == "Alpha").count == 2
    names = [item.name for item in result.items]
    assert names.count("Alpha") == 2
    assert names.index("Alpha") < names.index("Beta")
    assert names.index("Beta") < names.index(None)
    assert result.item_group_keys is not None
    assert result.item_group_keys == ["Alpha", "Alpha", "Beta", "__empty__"]


def test_invalid_group_by_is_rejected(session: Session):
    with pytest.raises(HTTPException) as exc:
        paginate(session, FilterParams(group_by="secret"))

    assert exc.value.status_code == 400
    assert exc.value.detail == "`secret` is not groupable"


def test_advanced_filter_and_multi_sort(session: Session):
    result = paginate(
        session,
        FilterParams(
            filters=(
                '[{"id":"amount","value":[100,500],'
                '"variant":"range","operator":"isBetween"}]'
            ),
            sort='[{"id":"amount","desc":true}]',
        ),
    )

    assert [item.id for item in result.items] == [3, 2, 1]
    assert result.total_items == 3


def test_negative_text_filter_keeps_null_rows(session: Session):
    result = paginate(
        session,
        FilterParams(
            filters=(
                '[{"id":"name","value":"Alpha",'
                '"variant":"text","operator":"notILike"}]'
            )
        ),
    )

    assert {item.id for item in result.items} == {2, 3}


@pytest.mark.parametrize(
    ("filters", "detail"),
    [
        ("not-json", "`filters` is not valid JSON"),
        (
            '[{"id":"secret","value":"x","variant":"text",'
            '"operator":"eq"}]',
            "`secret` is not filterable",
        ),
    ],
)
def test_invalid_filters_fail_loudly(
    session: Session, filters: str, detail: str
):
    with pytest.raises(HTTPException) as exc:
        paginate(session, FilterParams(filters=filters))

    assert exc.value.status_code == 400
    assert exc.value.detail == detail


def test_page_past_the_end_is_rejected(session: Session):
    with pytest.raises(HTTPException) as exc:
        paginate(session, FilterParams(page=3, page_size=2))

    assert exc.value.status_code == 400
    assert exc.value.detail == "Page number exceeds total pages"


def test_later_pages_skip_group_summaries_and_count(session: Session):
    session.add(
        Item(
            id=4,
            name="Alpha",
            amount=Decimal("150.00"),
            created_at=datetime(2026, 1, 4, tzinfo=timezone.utc),
        )
    )
    session.commit()

    page1 = paginate(
        session,
        FilterParams(page=1, page_size=2, group_by="name", skip_list_meta=True),
    )
    assert page1.groups is not None
    assert page1.total_items == 4
    assert len(page1.items) == 2

    page2 = paginate(
        session,
        FilterParams(page=2, page_size=2, group_by="name", skip_list_meta=True),
    )
    assert page2.groups is None
    assert page2.total_items == 0
    assert page2.total_pages == 2
    assert len(page2.items) == 2
    assert page2.item_group_keys is not None
    assert len(page2.item_group_keys) == 2


def test_skip_list_meta_overshot_page_returns_empty(session: Session):
    result = paginate(
        session, FilterParams(page=3, page_size=2, skip_list_meta=True)
    )
    assert result.items == []
    assert result.groups is None
    assert result.total_items == 0
    assert result.total_pages == 3
