"""Tests for DigitalItem and DigitalFile models."""

import pytest
from app import db
from app.models import DigitalItem, DigitalFile


def make_item(**kwargs):
    defaults = dict(
        title="Test Printable",
        description="A lovely printable.",
        price=4.99,
    )
    defaults.update(kwargs)
    return DigitalItem(**defaults)


class TestDigitalItem:
    def test_create_item(self, app):
        with app.app_context():
            item = make_item()
            db.session.add(item)
            db.session.commit()
            assert item.id is not None
            assert item.status == "draft"
            assert item.quantity == 999

    def test_tag_list_empty(self, app):
        with app.app_context():
            item = make_item(tags="")
            assert item.tag_list() == []

    def test_tag_list_single(self, app):
        with app.app_context():
            item = make_item(tags="floral")
            assert item.tag_list() == ["floral"]

    def test_tag_list_multiple(self, app):
        with app.app_context():
            item = make_item(tags="floral, watercolor, printable")
            assert item.tag_list() == ["floral", "watercolor", "printable"]

    def test_to_dict(self, app):
        with app.app_context():
            item = make_item(title="Dict Test", price=9.99)
            db.session.add(item)
            db.session.commit()
            d = item.to_dict()
            assert d["title"] == "Dict Test"
            assert d["price"] == 9.99
            assert d["status"] == "draft"
            assert isinstance(d["tags"], list)

    def test_repr(self, app):
        with app.app_context():
            item = make_item()
            assert "Test Printable" in repr(item)

    def test_delete_cascades_to_files(self, app):
        with app.app_context():
            item = make_item()
            db.session.add(item)
            db.session.flush()
            f = DigitalFile(
                item_id=item.id,
                filename="a.pdf",
                original_filename="a.pdf",
            )
            db.session.add(f)
            db.session.commit()
            file_id = f.id
            db.session.delete(item)
            db.session.commit()
            assert db.session.get(DigitalFile, file_id) is None


class TestDigitalFile:
    def test_create_file(self, app):
        with app.app_context():
            item = make_item()
            db.session.add(item)
            db.session.flush()
            f = DigitalFile(
                item_id=item.id,
                filename="stored.pdf",
                original_filename="original.pdf",
                file_size=1024,
                mime_type="application/pdf",
            )
            db.session.add(f)
            db.session.commit()
            assert f.id is not None

    def test_to_dict(self, app):
        with app.app_context():
            item = make_item()
            db.session.add(item)
            db.session.flush()
            f = DigitalFile(
                item_id=item.id,
                filename="s.png",
                original_filename="img.png",
                file_size=2048,
                mime_type="image/png",
            )
            db.session.add(f)
            db.session.commit()
            d = f.to_dict()
            assert d["original_filename"] == "img.png"
            assert d["file_size"] == 2048
