# Etsy Digital Items Creator

A Flask web application for managing and publishing digital product listings to Etsy.

## Features

- **Dashboard** – overview of all your digital items with status stats
- **Create / Edit / Delete** digital item listings (title, description, price, tags, category)
- **File uploads** – attach downloadable files to each listing (PDF, PNG, JPG, GIF, SVG, ZIP, EPS)
- **Etsy API integration** – publish or update listings directly on Etsy via the Open API v3
- **Status management** – draft, active, inactive
- **JSON API** – `/api/items` and `/api/items/<id>` endpoints for programmatic access

## Quick Start

### 1. Clone & install dependencies

```bash
git clone https://github.com/DarkCommander27/Etsy.git
cd Etsy
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in your SECRET_KEY and Etsy API credentials
```

### 3. Run the app

```bash
python run.py
```

Open http://127.0.0.1:5000 in your browser.

## Etsy API Setup

1. Create an app at https://www.etsy.com/developers/your-apps
2. Note your **API Key** and **API Secret**
3. Complete the OAuth 2.0 flow to obtain an **Access Token**
4. Find your **Shop ID** from your Etsy shop URL or the developer portal
5. Add these values to your `.env` file:

```
ETSY_API_KEY=your_api_key
ETSY_API_SECRET=your_api_secret
ETSY_ACCESS_TOKEN=your_oauth_access_token
ETSY_SHOP_ID=your_shop_id
```

Once configured, use the **Publish to Etsy** button on any item's detail page.

## Project Structure

```
app/
  __init__.py       # Flask app factory
  models.py         # SQLAlchemy models (DigitalItem, DigitalFile)
  routes.py         # Blueprint with all web and API routes
  etsy_api.py       # Etsy Open API v3 client
  templates/        # Jinja2 HTML templates
  static/           # CSS and JS assets
config.py           # Configuration classes
run.py              # Entry point
tests/              # pytest test suite
requirements.txt
.env.example
```

## Running Tests

```bash
python -m pytest tests/ -v
```

## Environment Variables

| Variable | Description |
|---|---|
| `SECRET_KEY` | Flask secret key (required) |
| `DATABASE_URL` | SQLAlchemy DB URI (defaults to SQLite `etsy_items.db`) |
| `ETSY_API_KEY` | Etsy Open API key |
| `ETSY_API_SECRET` | Etsy API secret |
| `ETSY_ACCESS_TOKEN` | OAuth 2.0 access token |
| `ETSY_SHOP_ID` | Your Etsy shop ID |
