"""Serve the imported HTML pages without exposing workspace files."""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import re
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parent
PAGES = {
    "/": ("_1/code.html", "التسعير الذكي"),
    "/simulator": ("_2/code.html", "حاسبة تسعير المنتج"),
    "/calculator": ("_3/code.html", "حاسبة التسعير التفصيلية"),
    "/product-catalog": ("_4/code.html", "قائمة المنتجات والأسعار"),
}
ALIASES = {f"/_{i}/code.html": route for i, route in enumerate(PAGES, 1)}
LINKS = {"simulator": "/simulator", "product-catalog": "/product-catalog"}


def render_page(route):
    filename, title = PAGES[route]
    content = (ROOT / filename).read_text(encoding="utf-8")
    # The import uses placeholder hrefs; connect only pages actually supplied.
    def connect_link(match):
        tag = match.group(0)
        target = re.search(r'data-path="([^"]+)"', tag)
        if target and target.group(1) in LINKS:
            tag = re.sub(r'href="[^"]*"', f'href="{LINKS[target.group(1)]}"', tag)
        return tag

    content = re.sub(r"<a\b[^>]*>", connect_link, content)
    content = content.replace("</head>", f"<title>{title}</title></head>", 1)
    items = "".join(
        f'<a href="{path}"'
        + (' aria-current="page"' if path == route else "")
        + f'>{label}</a>'
        for path, (_, label) in PAGES.items()
    )
    navigation = """
<style>
 .import-pages {position:fixed;bottom:12px;left:12px;z-index:100;
 font:13px "IBM Plex Sans Arabic",sans-serif;direction:rtl;
 background:white;color:#14213d;border:1px solid #c5c6ce;
 border-radius:12px;padding:10px 14px;box-shadow:0 3px 12px #14213d22}
 .import-pages summary {cursor:pointer;font-weight:700}
 .import-pages nav {display:grid;gap:4px;padding-top:8px}
 .import-pages a {padding:8px;border-radius:6px;text-decoration:none;color:#14213d}
 .import-pages a:hover,.import-pages a[aria-current] {background:#e8faf5}
</style>
<details class="import-pages"><summary>الصفحات المستوردة</summary>
<nav aria-label="الصفحات المستوردة">""" + items + "</nav></details>"
    return content.replace("</body>", navigation + "</body>").encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.respond(include_body=True)

    def do_HEAD(self):
        self.respond(include_body=False)

    def respond(self, include_body):
        route = urlsplit(self.path).path
        route = ALIASES.get(route, route)
        if route not in PAGES:
            self.send_error(404, "This page was not included in the import.")
            return
        body = render_page(route)
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        if include_body:
            self.wfile.write(body)


if __name__ == "__main__":
    print("Serving imported pages on port 5000", flush=True)
    ThreadingHTTPServer(("0.0.0.0", 5000), Handler).serve_forever()
