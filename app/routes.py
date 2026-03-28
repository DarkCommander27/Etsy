import os
import uuid
import mimetypes
from flask import (
    Blueprint,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    jsonify,
    current_app,
    send_from_directory,
)
from werkzeug.utils import secure_filename
from app import db
from app.models import DigitalItem, DigitalFile
from app.etsy_api import get_etsy_client, EtsyAPIError

main = Blueprint("main", __name__)


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in current_app.config["ALLOWED_EXTENSIONS"]
    )


def safe_file_path(upload_folder, filename):
    """Return an absolute path inside upload_folder, or None if path traversal detected."""
    target = os.path.realpath(os.path.join(upload_folder, filename))
    if not target.startswith(os.path.realpath(upload_folder) + os.sep):
        return None
    return target


def _save_upload(f, upload_folder):
    """Validate, save an uploaded file and return a DigitalFile-ready dict, or None."""
    if not (f and f.filename and allowed_file(f.filename)):
        return None
    original_name = secure_filename(f.filename)
    ext = original_name.rsplit(".", 1)[1].lower()
    stored_name = f"{uuid.uuid4().hex}.{ext}"
    save_path = safe_file_path(upload_folder, stored_name)
    if save_path is None:
        return None
    f.save(save_path)
    size = os.path.getsize(save_path)
    if size == 0:
        os.remove(save_path)
        return None
    mime = mimetypes.guess_type(original_name)[0] or "application/octet-stream"
    return {
        "filename": stored_name,
        "original_filename": original_name,
        "file_size": size,
        "mime_type": mime,
    }


# ── Dashboard ──────────────────────────────────────────────────────────────────

@main.route("/")
def dashboard():
    items = DigitalItem.query.order_by(DigitalItem.created_at.desc()).all()
    stats = {
        "total": len(items),
        "draft": sum(1 for i in items if i.status == "draft"),
        "active": sum(1 for i in items if i.status == "active"),
        "inactive": sum(1 for i in items if i.status == "inactive"),
    }
    return render_template("dashboard.html", items=items, stats=stats)


# ── Create item ────────────────────────────────────────────────────────────────

@main.route("/items/new", methods=["GET", "POST"])
def create_item():
    if request.method == "POST":
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        price_str = request.form.get("price", "0").strip()
        quantity_str = request.form.get("quantity", "999").strip()
        tags = request.form.get("tags", "").strip()
        category = request.form.get("category", "").strip()

        errors = []
        if not title:
            errors.append("Title is required.")
        if not description:
            errors.append("Description is required.")
        try:
            price = float(price_str)
            if price < 0:
                errors.append("Price must be non-negative.")
        except ValueError:
            errors.append("Price must be a number.")
            price = 0.0
        try:
            quantity = int(quantity_str)
            if quantity < 0:
                errors.append("Quantity must be non-negative.")
        except ValueError:
            errors.append("Quantity must be a whole number.")
            quantity = 999

        if errors:
            for e in errors:
                flash(e, "danger")
            return render_template(
                "create_item.html",
                form_data=request.form,
            )

        item = DigitalItem(
            title=title,
            description=description,
            price=price,
            quantity=quantity,
            tags=tags,
            category=category,
            status="draft",
        )
        db.session.add(item)
        db.session.flush()  # get item.id before committing

        # Handle file uploads
        files = request.files.getlist("files")
        for f in files:
            info = _save_upload(f, current_app.config["UPLOAD_FOLDER"])
            if info:
                db.session.add(DigitalFile(item_id=item.id, **info))

        db.session.commit()
        flash(f'Item "{item.title}" created successfully.', "success")
        return redirect(url_for("main.item_detail", item_id=item.id))

    return render_template("create_item.html", form_data={})


# ── Item detail ────────────────────────────────────────────────────────────────

@main.route("/items/<int:item_id>")
def item_detail(item_id):
    item = db.get_or_404(DigitalItem, item_id)
    return render_template("item_detail.html", item=item)


# ── Edit item ──────────────────────────────────────────────────────────────────

@main.route("/items/<int:item_id>/edit", methods=["GET", "POST"])
def edit_item(item_id):
    item = db.get_or_404(DigitalItem, item_id)

    if request.method == "POST":
        title = request.form.get("title", "").strip()
        description = request.form.get("description", "").strip()
        price_str = request.form.get("price", "0").strip()
        quantity_str = request.form.get("quantity", "999").strip()
        tags = request.form.get("tags", "").strip()
        category = request.form.get("category", "").strip()

        errors = []
        if not title:
            errors.append("Title is required.")
        if not description:
            errors.append("Description is required.")
        try:
            price = float(price_str)
            if price < 0:
                errors.append("Price must be non-negative.")
        except ValueError:
            errors.append("Price must be a number.")
            price = item.price
        try:
            quantity = int(quantity_str)
            if quantity < 0:
                errors.append("Quantity must be non-negative.")
        except ValueError:
            errors.append("Quantity must be a whole number.")
            quantity = item.quantity

        if errors:
            for e in errors:
                flash(e, "danger")
            return render_template("edit_item.html", item=item)

        item.title = title
        item.description = description
        item.price = price
        item.quantity = quantity
        item.tags = tags
        item.category = category

        # Handle additional file uploads
        files = request.files.getlist("files")
        for f in files:
            info = _save_upload(f, current_app.config["UPLOAD_FOLDER"])
            if info:
                db.session.add(DigitalFile(item_id=item.id, **info))

        db.session.commit()
        flash(f'Item "{item.title}" updated.', "success")
        return redirect(url_for("main.item_detail", item_id=item.id))

    return render_template("edit_item.html", item=item)


# ── Delete item ────────────────────────────────────────────────────────────────

@main.route("/items/<int:item_id>/delete", methods=["POST"])
def delete_item(item_id):
    item = db.get_or_404(DigitalItem, item_id)

    # Remove stored files from disk
    for f in item.files:
        file_path = safe_file_path(current_app.config["UPLOAD_FOLDER"], f.filename)
        if file_path and os.path.exists(file_path):
            os.remove(file_path)

    db.session.delete(item)
    db.session.commit()
    flash(f'Item "{item.title}" deleted.', "info")
    return redirect(url_for("main.dashboard"))


# ── Delete a single file ───────────────────────────────────────────────────────

@main.route("/files/<int:file_id>/delete", methods=["POST"])
def delete_file(file_id):
    digital_file = db.get_or_404(DigitalFile, file_id)
    item_id = digital_file.item_id
    file_path = safe_file_path(current_app.config["UPLOAD_FOLDER"], digital_file.filename)
    if file_path and os.path.exists(file_path):
        os.remove(file_path)
    db.session.delete(digital_file)
    db.session.commit()
    flash("File removed.", "info")
    return redirect(url_for("main.item_detail", item_id=item_id))


# ── Download a file ────────────────────────────────────────────────────────────

@main.route("/files/<int:file_id>/download")
def download_file(file_id):
    digital_file = db.get_or_404(DigitalFile, file_id)
    return send_from_directory(
        current_app.config["UPLOAD_FOLDER"],
        digital_file.filename,
        as_attachment=True,
        download_name=digital_file.original_filename,
    )


# ── Publish to Etsy ────────────────────────────────────────────────────────────

@main.route("/items/<int:item_id>/publish", methods=["POST"])
def publish_to_etsy(item_id):
    item = db.get_or_404(DigitalItem, item_id)
    client = get_etsy_client(current_app)

    if not client.api_key or not client.access_token or not client.shop_id:
        flash(
            "Etsy API credentials are not configured. "
            "Set ETSY_API_KEY, ETSY_ACCESS_TOKEN, and ETSY_SHOP_ID in your .env file.",
            "warning",
        )
        return redirect(url_for("main.item_detail", item_id=item_id))

    try:
        if item.etsy_listing_id:
            client.update_listing(item.etsy_listing_id, item)
            flash("Etsy listing updated successfully.", "success")
        else:
            result = client.create_listing(item)
            item.etsy_listing_id = str(result.get("listing_id", ""))
            item.status = "active"
            db.session.commit()
            flash("Item published to Etsy as a draft listing.", "success")
    except EtsyAPIError as exc:
        flash(f"Etsy API error: {exc}", "danger")

    return redirect(url_for("main.item_detail", item_id=item_id))


# ── Update status ──────────────────────────────────────────────────────────────

@main.route("/items/<int:item_id>/status", methods=["POST"])
def update_status(item_id):
    item = db.get_or_404(DigitalItem, item_id)
    new_status = request.form.get("status", item.status)
    allowed = {"draft", "active", "inactive"}
    if new_status in allowed:
        item.status = new_status
        db.session.commit()
        flash(f'Status updated to "{new_status}".', "success")
    else:
        flash("Invalid status.", "danger")
    return redirect(url_for("main.item_detail", item_id=item_id))


# ── JSON API ───────────────────────────────────────────────────────────────────

@main.route("/api/items")
def api_list_items():
    items = DigitalItem.query.order_by(DigitalItem.created_at.desc()).all()
    return jsonify([i.to_dict() for i in items])


@main.route("/api/items/<int:item_id>")
def api_get_item(item_id):
    item = db.get_or_404(DigitalItem, item_id)
    return jsonify(item.to_dict())
