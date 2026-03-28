"""Etsy API v3 integration helpers."""

import requests


class EtsyAPIError(Exception):
    pass


class EtsyClient:
    """Thin wrapper around the Etsy Open API v3."""

    def __init__(self, api_key, access_token, shop_id, base_url=None, taxonomy_id=2078):
        self.api_key = api_key
        self.access_token = access_token
        self.shop_id = shop_id
        self.base_url = base_url or "https://openapi.etsy.com/v3"
        self.taxonomy_id = taxonomy_id

    def _headers(self):
        return {
            "x-api-key": self.api_key,
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    def _handle_response(self, response):
        if not response.ok:
            raise EtsyAPIError(
                f"Etsy API error {response.status_code}: {response.text}"
            )
        return response.json()

    def create_listing(self, item):
        """Create a new draft listing on Etsy from a DigitalItem."""
        payload = {
            "title": item.title,
            "description": item.description,
            "price": item.price,
            "quantity": item.quantity,
            "who_made": "i_did",
            "when_made": "made_to_order",
            "taxonomy_id": self.taxonomy_id,
            "type": "download",
            "tags": item.tag_list(),
            "state": "draft",
        }
        url = f"{self.base_url}/application/shops/{self.shop_id}/listings"
        response = requests.post(url, json=payload, headers=self._headers(), timeout=30)
        return self._handle_response(response)

    def update_listing(self, listing_id, item):
        """Update an existing Etsy listing."""
        payload = {
            "title": item.title,
            "description": item.description,
            "price": item.price,
            "quantity": item.quantity,
            "tags": item.tag_list(),
            "state": "active" if item.status == "active" else "draft",
        }
        url = (
            f"{self.base_url}/application/shops/{self.shop_id}/listings/{listing_id}"
        )
        response = requests.patch(url, json=payload, headers=self._headers(), timeout=30)
        return self._handle_response(response)

    def delete_listing(self, listing_id):
        """Delete an Etsy listing."""
        url = (
            f"{self.base_url}/application/shops/{self.shop_id}/listings/{listing_id}"
        )
        response = requests.delete(url, headers=self._headers(), timeout=30)
        if response.status_code == 204:
            return {}
        return self._handle_response(response)

    def upload_listing_file(self, listing_id, file_path, file_name):
        """Upload a digital file to an Etsy listing."""
        url = f"{self.base_url}/application/shops/{self.shop_id}/listings/{listing_id}/files"
        with open(file_path, "rb") as f:
            files = {"file": (file_name, f)}
            headers = {
                "x-api-key": self.api_key,
                "Authorization": f"Bearer {self.access_token}",
            }
            response = requests.post(url, files=files, headers=headers, timeout=60)
        return self._handle_response(response)

    def get_listing(self, listing_id):
        """Fetch a listing by ID."""
        url = f"{self.base_url}/application/listings/{listing_id}"
        response = requests.get(url, headers=self._headers(), timeout=30)
        return self._handle_response(response)


def get_etsy_client(app):
    """Build an EtsyClient from Flask app config."""
    return EtsyClient(
        api_key=app.config["ETSY_API_KEY"],
        access_token=app.config["ETSY_ACCESS_TOKEN"],
        shop_id=app.config["ETSY_SHOP_ID"],
        base_url=app.config.get("ETSY_BASE_URL", "https://openapi.etsy.com/v3"),
        taxonomy_id=app.config.get("ETSY_TAXONOMY_ID", 2078),
    )
