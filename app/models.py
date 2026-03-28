from datetime import datetime, timezone
from app import db


class DigitalItem(db.Model):
    """Represents a digital product for sale on Etsy."""

    __tablename__ = "digital_items"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(140), nullable=False)
    description = db.Column(db.Text, nullable=False)
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Integer, default=999)
    tags = db.Column(db.String(500), default="")
    category = db.Column(db.String(100), default="")
    status = db.Column(
        db.String(20), default="draft"
    )  # draft, active, inactive, sold_out
    etsy_listing_id = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    files = db.relationship(
        "DigitalFile", backref="item", lazy=True, cascade="all, delete-orphan"
    )

    def tag_list(self):
        """Return tags as a Python list."""
        if not self.tags:
            return []
        return [t.strip() for t in self.tags.split(",") if t.strip()]

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "quantity": self.quantity,
            "tags": self.tag_list(),
            "category": self.category,
            "status": self.status,
            "etsy_listing_id": self.etsy_listing_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<DigitalItem id={self.id} title={self.title!r} status={self.status}>"


class DigitalFile(db.Model):
    """A file attached to a digital item (e.g. the PDF, PNG download)."""

    __tablename__ = "digital_files"

    id = db.Column(db.Integer, primary_key=True)
    item_id = db.Column(
        db.Integer, db.ForeignKey("digital_items.id"), nullable=False
    )
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_size = db.Column(db.Integer, default=0)  # bytes
    mime_type = db.Column(db.String(100), default="")
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "item_id": self.item_id,
            "filename": self.filename,
            "original_filename": self.original_filename,
            "file_size": self.file_size,
            "mime_type": self.mime_type,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
        }

    def __repr__(self):
        return f"<DigitalFile id={self.id} filename={self.filename!r}>"
