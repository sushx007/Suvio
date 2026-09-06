"""
Suvio is a Next.js application whose backend lives inside the Next.js
`app/api/*` route handlers on port 3000. This tiny FastAPI service exists
solely because the Kubernetes ingress in this workspace routes every
`/api/*` request to port 8001. We transparently proxy those requests to
the Next.js server so the app works end-to-end without any code changes.

In production (Vercel / self-hosted Next.js) this proxy is NOT needed —
Next.js handles `/api/*` on its own. Remove this file for that deployment.
"""
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

NEXT_ORIGIN = "http://localhost:3000"

app = FastAPI(title="Suvio Next.js Proxy")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"ok": True, "service": "suvio-nextjs-proxy"}


HOP_BY_HOP = {
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailers", "transfer-encoding", "upgrade", "content-encoding",
    "content-length",
}


def _build_response(content: bytes, status_code: int, upstream_headers) -> Response:
    """Build a Starlette Response that preserves multi-valued headers
    (critical for multiple Set-Cookie entries, which Google OAuth relies on)."""
    raw = []
    for k, v in upstream_headers.multi_items():
        if k.lower() in HOP_BY_HOP:
            continue
        raw.append((k.encode("latin-1"), v.encode("latin-1")))
    resp = Response(content=content, status_code=status_code)
    resp.raw_headers = raw
    return resp


@app.api_route("/api/{path:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])
async def proxy_api(path: str, request: Request):
    target = f"{NEXT_ORIGIN}/api/{path}"
    if request.url.query:
        target = f"{target}?{request.url.query}"

    body = await request.body()
    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() != "host" and k.lower() not in HOP_BY_HOP
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        upstream = await client.request(
            request.method, target, headers=headers, content=body,
            follow_redirects=False,
        )

    return _build_response(upstream.content, upstream.status_code, upstream.headers)
