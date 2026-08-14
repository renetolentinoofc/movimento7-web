#!/usr/bin/env python3
"""Verifica periodicamente o site e a API pública do Movimento 7."""

from __future__ import annotations

import argparse
import json
import os
import signal
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit, urlunsplit
from urllib.request import Request, urlopen

DEFAULT_URLS = (
    "https://movimento7.com.br/",
    "https://movimento7.onrender.com/api/v1/health/live",
)
USER_AGENT = "Movimento7-Availability-Monitor/1.0"
stop_event = threading.Event()


def safe_url(value: str) -> str:
    parsed = urlsplit(value.strip())
    if parsed.scheme != "https" or not parsed.hostname:
        raise ValueError("cada URL precisa ser HTTPS e possuir um hostname")
    if parsed.username or parsed.password:
        raise ValueError("credenciais não podem ser incorporadas à URL")
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path or "/", "", ""))


def configured_urls() -> tuple[str, ...]:
    raw = os.getenv("KEEP_ALIVE_URLS", "")
    values = raw.split(",") if raw.strip() else DEFAULT_URLS
    urls = tuple(safe_url(value) for value in values if value.strip())
    if not urls:
        raise ValueError("nenhuma URL foi configurada")
    return urls


def check(url: str, timeout: float) -> dict[str, object]:
    started = time.monotonic()
    request = Request(
        url,
        headers={"Accept": "text/html,application/json", "User-Agent": USER_AGENT},
        method="GET",
    )
    status: int | None = None
    error: str | None = None
    try:
        with urlopen(request, timeout=timeout) as response:
            status = response.status
            response.read(256)
    except HTTPError as exc:
        status = exc.code
        error = f"HTTP {exc.code}"
    except (TimeoutError, URLError, OSError) as exc:
        error = type(exc).__name__

    elapsed_ms = round((time.monotonic() - started) * 1000)
    return {
        "timestamp": datetime.now(UTC).isoformat(),
        "url": safe_url(url),
        "status": status,
        "ok": status is not None and 200 <= status < 400,
        "elapsed_ms": elapsed_ms,
        "error": error,
    }


def run_cycle(urls: tuple[str, ...], timeout: float) -> bool:
    with ThreadPoolExecutor(max_workers=len(urls)) as executor:
        results = list(executor.map(lambda url: check(url, timeout), urls))
    for result in results:
        print(json.dumps(result, ensure_ascii=False), flush=True)
    return all(bool(result["ok"]) for result in results)


def request_stop(_signum: int, _frame: object) -> None:
    stop_event.set()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--interval", type=float, default=40.0)
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--once", action="store_true")
    args = parser.parse_args()
    if args.interval < 10:
        parser.error("o intervalo mínimo é de 10 segundos")
    if not 1 <= args.timeout <= args.interval:
        parser.error("o timeout deve ficar entre 1 segundo e o intervalo")

    try:
        urls = configured_urls()
    except ValueError as exc:
        parser.error(str(exc))

    if args.once:
        return 0 if run_cycle(urls, args.timeout) else 1

    signal.signal(signal.SIGINT, request_stop)
    signal.signal(signal.SIGTERM, request_stop)
    print(
        json.dumps(
            {
                "event": "monitor_started",
                "interval_seconds": args.interval,
                "targets": list(urls),
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    while not stop_event.is_set():
        cycle_started = time.monotonic()
        run_cycle(urls, args.timeout)
        remaining = max(0.0, args.interval - (time.monotonic() - cycle_started))
        stop_event.wait(remaining)
    print(json.dumps({"event": "monitor_stopped"}), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
