"""Read-only regional aviation and explicit self-image FaceCheck lookups."""
import argparse
import datetime as dt
import json
import math
import os
import secrets
import shutil
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path
from urllib.parse import urlsplit

FACE = "https://facecheck.id"
AIR = "https://api.airplanes.live/v2/point"
LIMIT = 16 * 1024 * 1024


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request_json(url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, headers={
        "Accept": "application/json", "User-Agent": "public-source-research/1.0",
        **(headers or {}),
    })
    with urllib.request.build_opener(NoRedirect()).open(req, timeout=15) as response:
        raw = response.read(LIMIT + 1)
    if len(raw) > LIMIT:
        raise ValueError("Provider response exceeds the size limit.")
    result = json.loads(raw)
    if not isinstance(result, dict):
        raise ValueError("Unexpected provider response.")
    if result.get("error"):
        raise ValueError("Provider rejected the request: " + str(result["error"])[:180])
    return result


def iso_time(seconds):
    return dt.datetime.fromtimestamp(seconds, dt.timezone.utc).isoformat()


def air_area(lat, lon, radius):
    if not (-90 <= lat <= 90 and -180 <= lon <= 180 and 0 < radius <= 250):
        raise ValueError("Expected latitude ±90, longitude ±180 and radius >0 to 250 NM.")
    url = f"{AIR}/{lat:.6f}/{lon:.6f}/{radius:g}"
    data = request_json(url)
    aircraft = data.get("ac")
    if not isinstance(aircraft, list):
        raise ValueError("Airplanes.live returned no regional aircraft list.")
    stamp = data.get("now")
    observed = None
    if isinstance(stamp, (float, int)) and math.isfinite(stamp) and stamp > 0:
        observed = iso_time(stamp / 1000 if stamp >= 100_000_000_000 else stamp)
    return {"source": url, "aircraft_count": len(aircraft), "radius_nm": radius,
            "observed_utc": observed, "retrieved_utc": iso_time(time.time())}


def face_auth():
    token = os.environ.get("FACECHECK_API_TOKEN")
    if not token:
        raise ValueError("FACECHECK_API_TOKEN is not configured.")
    return {"Authorization": token}


def face_info():
    info = request_json(FACE + "/api/info", b"", face_auth())
    if not isinstance(info.get("is_online"), bool):
        raise ValueError("FaceCheck returned no service status.")
    return {k: info.get(k) for k in ("is_online", "remaining_credits", "has_credits_to_search")}


def own_photo(path, paid):
    auth = face_auth()
    with path.open("rb") as file:
        image = file.read(8 * 1024 * 1024 + 1)
    if len(image) > 8 * 1024 * 1024:
        raise ValueError("Choose a JPEG or PNG under 8 MiB.")
    if image.startswith(b"\xff\xd8\xff"):
        mime, name = "image/jpeg", "image.jpg"
    elif image.startswith(b"\x89PNG\r\n\x1a\n"):
        mime, name = "image/png", "image.png"
    else:
        raise ValueError("Expected a JPEG or PNG image.")
    boundary = secrets.token_hex(24)
    prefix = (f'--{boundary}\r\nContent-Disposition: form-data; name="images"; '
              f'filename="{name}"\r\nContent-Type: {mime}\r\n\r\n').encode("ascii")
    body = prefix + image + f"\r\n--{boundary}--\r\n".encode("ascii")
    result = request_json(FACE + "/api/upload_pic", body, {
        **auth, "Content-Type": "multipart/form-data; boundary=" + boundary,
    })
    search_id = result.get("id_search")
    if not isinstance(search_id, str) or not search_id:
        raise ValueError("FaceCheck returned no search ID.")
    return search_result(search_id, paid)


def search_result(search_id, paid, resume=False):
    deadline = time.monotonic() + 150
    check_only = resume
    while time.monotonic() < deadline:
        payload = {"id_search": search_id, "demo": not paid,
                   "with_progress": True, "status_only": check_only}
        result = request_json(FACE + "/api/search", json.dumps(payload).encode(), {
            **face_auth(), "Content-Type": "application/json",
        })
        check_only = True
        output = result.get("output")
        if isinstance(output, dict) and isinstance(output.get("items"), list):
            matches = []
            for item in output["items"]:
                if not isinstance(item, dict):
                    continue
                url = item.get("url")
                if isinstance(url, dict):
                    url = url.get("value")
                if isinstance(url, str) and urlsplit(url).scheme in {"http", "https"}:
                    matches.append({"source": url, "score": item.get("score")})
            return {"mode": "paid" if paid else "demo", "candidate_pages": matches}
        time.sleep(3)
    return {"status": "pending", "search_id": search_id, "mode": "paid" if paid else "demo",
            "next": "Use facecheck-status with this ID to poll without a new submission."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest="command", required=True)
    subs.add_parser("status")
    subs.add_parser("facecheck-info")
    face = subs.add_parser("facecheck-own-photo")
    face.add_argument("path", type=Path)
    face.add_argument("--paid", action="store_true", help="Use billable search instead of demo.")
    poll = subs.add_parser("facecheck-status")
    poll.add_argument("search_id")
    poll.add_argument("--paid", action="store_true", help="Match the original search mode.")
    air = subs.add_parser("air-area")
    for arg in ("lat", "lon", "radius"):
        air.add_argument(arg, type=float)
    args = parser.parse_args()
    if args.command == "status":
        result = {"facecheck_token_present": bool(os.environ.get("FACECHECK_API_TOKEN")),
                  "robin_docker_cli_present": bool(shutil.which("docker")),
                  "airplanes_map": "https://globe.airplanes.live/", "network_checked": False}
    elif args.command == "facecheck-info":
        result = face_info()
    elif args.command == "facecheck-own-photo":
        result = own_photo(args.path, args.paid)
    elif args.command == "facecheck-status":
        result = search_result(args.search_id, args.paid, resume=True)
    else:
        result = air_area(args.lat, args.lon, args.radius)
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError, OverflowError, urllib.error.URLError) as error:
        sys.exit(str(error))
