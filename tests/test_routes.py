"""Tests for Flask routes."""

import io
import json
import pytest
from app import db
from app.models import DigitalItem


def create_item_via_post(client, **overrides):
    data = dict(
        title="My Printable",
        description="A great printable.",
        price="5.00",
        quantity="999",
        tags="art, print",
        category="Printables",
    )
    data.update(overrides)
    return client.post("/items/new", data=data, follow_redirects=True)


class TestDashboard:
    def test_dashboard_empty(self, client):
        response = client.get("/")
        assert response.status_code == 200
        assert b"No digital items yet" in response.data

    def test_dashboard_shows_items(self, client, app):
        with app.app_context():
            item = DigitalItem(
                title="Dashboard Item",
                description="Desc",
                price=3.0,
            )
            db.session.add(item)
            db.session.commit()
        response = client.get("/")
        assert b"Dashboard Item" in response.data


class TestCreateItem:
    def test_get_create_form(self, client):
        response = client.get("/items/new")
        assert response.status_code == 200
        assert b"Create New Item" in response.data

    def test_create_item_success(self, client, app):
        response = create_item_via_post(client)
        assert response.status_code == 200
        assert b"created successfully" in response.data
        with app.app_context():
            item = DigitalItem.query.first()
            assert item is not None
            assert item.title == "My Printable"
            assert item.price == 5.0
            assert item.status == "draft"

    def test_create_item_missing_title(self, client):
        response = create_item_via_post(client, title="")
        assert b"Title is required" in response.data

    def test_create_item_missing_description(self, client):
        response = create_item_via_post(client, description="")
        assert b"Description is required" in response.data

    def test_create_item_invalid_price(self, client):
        response = create_item_via_post(client, price="abc")
        assert b"Price must be a number" in response.data

    def test_create_item_negative_price(self, client):
        response = create_item_via_post(client, price="-1")
        assert b"Price must be non-negative" in response.data

    def test_create_item_with_file_upload(self, client, app):
        data = dict(
            title="File Upload Item",
            description="With file.",
            price="3.00",
            quantity="999",
            tags="",
            category="",
        )
        data["files"] = (io.BytesIO(b"PDF content"), "sample.pdf")
        response = client.post(
            "/items/new",
            data=data,
            content_type="multipart/form-data",
            follow_redirects=True,
        )
        assert response.status_code == 200
        assert b"created successfully" in response.data
        with app.app_context():
            item = DigitalItem.query.filter_by(title="File Upload Item").first()
            assert item is not None
            assert len(item.files) == 1
            assert item.files[0].original_filename == "sample.pdf"


class TestItemDetail:
    def test_item_detail_404(self, client):
        response = client.get("/items/9999")
        assert response.status_code == 404

    def test_item_detail_shows_info(self, client, app):
        with app.app_context():
            item = DigitalItem(
                title="Detail Item", description="Desc", price=7.0,
                tags="tag1, tag2"
            )
            db.session.add(item)
            db.session.commit()
            item_id = item.id
        response = client.get(f"/items/{item_id}")
        assert b"Detail Item" in response.data
        assert b"tag1" in response.data


class TestEditItem:
    def test_edit_item_success(self, client, app):
        with app.app_context():
            item = DigitalItem(title="Old Title", description="Old", price=1.0)
            db.session.add(item)
            db.session.commit()
            item_id = item.id
        response = client.post(
            f"/items/{item_id}/edit",
            data=dict(
                title="New Title",
                description="New desc",
                price="9.99",
                quantity="100",
                tags="new",
                category="Cat",
            ),
            follow_redirects=True,
        )
        assert b"updated" in response.data
        with app.app_context():
            item = db.session.get(DigitalItem, item_id)
            assert item.title == "New Title"
            assert item.price == 9.99

    def test_edit_item_404(self, client):
        response = client.post(
            "/items/9999/edit",
            data=dict(title="X", description="Y", price="1"),
        )
        assert response.status_code == 404


class TestDeleteItem:
    def test_delete_item(self, client, app):
        with app.app_context():
            item = DigitalItem(title="To Delete", description="Del", price=1.0)
            db.session.add(item)
            db.session.commit()
            item_id = item.id
        response = client.post(
            f"/items/{item_id}/delete", follow_redirects=True
        )
        assert response.status_code == 200
        assert b"deleted" in response.data
        with app.app_context():
            assert db.session.get(DigitalItem, item_id) is None


class TestUpdateStatus:
    def test_update_status(self, client, app):
        with app.app_context():
            item = DigitalItem(title="Status Item", description="S", price=1.0)
            db.session.add(item)
            db.session.commit()
            item_id = item.id
        client.post(f"/items/{item_id}/status", data={"status": "active"})
        with app.app_context():
            item = db.session.get(DigitalItem, item_id)
            assert item.status == "active"


class TestAPIEndpoints:
    def test_api_list_items_empty(self, client):
        response = client.get("/api/items")
        assert response.status_code == 200
        assert json.loads(response.data) == []

    def test_api_list_items(self, client, app):
        with app.app_context():
            item = DigitalItem(title="API Item", description="D", price=2.0)
            db.session.add(item)
            db.session.commit()
        response = client.get("/api/items")
        data = json.loads(response.data)
        assert len(data) == 1
        assert data[0]["title"] == "API Item"

    def test_api_get_item(self, client, app):
        with app.app_context():
            item = DigitalItem(title="Single", description="D", price=5.0)
            db.session.add(item)
            db.session.commit()
            item_id = item.id
        response = client.get(f"/api/items/{item_id}")
        data = json.loads(response.data)
        assert data["title"] == "Single"

    def test_api_get_item_404(self, client):
        response = client.get("/api/items/9999")
        assert response.status_code == 404
