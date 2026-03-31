import os

# ── Security ──────────────────────────────────────────────────────────────────
SECRET_KEY = os.getenv("SUPERSET_SECRET_KEY", "supersetchangeme_longkey_1234567890abcd")

# ── Embedded dashboards ───────────────────────────────────────────────────────
FEATURE_FLAGS = {
    "EMBEDDED_SUPERSET": True,
}

# ── Guest token role ──────────────────────────────────────────────────────────
# Make the Public role (used by guest tokens) inherit all of Gamma's permissions.
# Gamma has all the read access needed for dashboards/charts/datasets.
PUBLIC_ROLE_LIKE = "Gamma"

# ── CORS — allow the Next.js app to call Superset APIs ───────────────────────
# ENABLE_CORS = True
# CORS_OPTIONS = {
#     "supports_credentials": True,
#     "allow_headers": ["*"],
#     "resources": ["*"],
#     "origins": ["http://localhost:3000"],
# }

# ── Disable HTTPS-only policies for local development ────────────────────────
TALISMAN_ENABLED = False
WTF_CSRF_ENABLED = False

# ── Cookie settings — required so the iframe session works over HTTP ─────────
SESSION_COOKIE_SAMESITE = None   # Python None = no SameSite attribute
SESSION_COOKIE_SECURE = False
SESSION_COOKIE_HTTPONLY = True

# ── Do not add X-Frame-Options so iframes are allowed ────────────────────────
HTTP_HEADERS = {}
