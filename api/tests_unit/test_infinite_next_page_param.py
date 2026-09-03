"""Mirrors src/lib/data-table-infinite.ts — no FE test runner in this repo."""


def get_infinite_table_next_page_param(last_page: dict) -> int | None:
    if len(last_page["items"]) < last_page["page_size"]:
        return None
    return last_page["page"] + 1


def test_full_page_requests_next():
    assert (
        get_infinite_table_next_page_param(
            {"items": [1, 2], "page_size": 2, "page": 1}
        )
        == 2
    )


def test_short_page_stops():
    assert (
        get_infinite_table_next_page_param(
            {"items": [1], "page_size": 2, "page": 2}
        )
        is None
    )


def test_empty_page_stops():
    assert (
        get_infinite_table_next_page_param(
            {"items": [], "page_size": 50, "page": 3}
        )
        is None
    )
