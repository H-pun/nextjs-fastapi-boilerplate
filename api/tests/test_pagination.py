from unittest.mock import patch

from fastapi.testclient import TestClient
import pytest

list_url = ["/user"]


@pytest.mark.parametrize("url", list_url)
def test_pagination(client: TestClient, url: str):
    def test_get_all(client: TestClient, base_url: str):
        r = client.get(base_url)
        assert r.status_code == 200

        data = r.json()
        assert isinstance(data["items"], list)
        assert data["page"] <= data["page_size"]

    def test_get_all_fail_page(client: TestClient, base_url: str):
        r = client.get(base_url, params={"page": 2, "search": "asd"})
        assert r.status_code == 400

    def test_get_all_no_result(client: TestClient, base_url: str):
        r = client.get(base_url, params={"search": "asd"})
        assert r.status_code == 200

        data = r.json()
        assert isinstance(data["items"], list)
        assert data["page"] <= data["page_size"]
        assert len(data["items"]) == 0

    test_get_all(client, url)
    test_get_all_fail_page(client, url)
    test_get_all_no_result(client, url)
