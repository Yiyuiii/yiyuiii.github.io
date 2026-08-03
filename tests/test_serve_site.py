import threading
import urllib.error
import urllib.request

import pytest

from scripts.serve_site import (
    SiteThreadingHTTPServer,
    create_server,
    parse_args,
    resolve_site,
)


def write(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


class RunningServer:
    def __init__(self, site):
        self.server = create_server(site=site, bind="127.0.0.1", port=0)
        self.thread = threading.Thread(target=self.server.serve_forever)

    def __enter__(self):
        self.thread.start()
        host, port = self.server.server_address
        return f"http://{host}:{port}"

    def __exit__(self, exc_type, exc_value, traceback):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=5)
        assert not self.thread.is_alive()


def make_site(tmp_path):
    site = tmp_path / "site"
    write(site / "index.html", "<h1>Home</h1>")
    write(site / "404.html", "<h1>Page not found</h1>")
    return site


def test_existing_file_keeps_normal_static_response(tmp_path):
    site = make_site(tmp_path)

    with RunningServer(site) as base_url:
        with urllib.request.urlopen(f"{base_url}/index.html", timeout=5) as response:
            assert response.status == 200
            assert response.headers.get_content_type() == "text/html"
            assert response.read() == b"<h1>Home</h1>"


def test_missing_path_returns_custom_404_with_404_status(tmp_path):
    site = make_site(tmp_path)
    expected = (site / "404.html").read_bytes()

    with RunningServer(site) as base_url:
        with pytest.raises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(f"{base_url}/en/not-real", timeout=5)

        response = caught.value
        assert response.code == 404
        assert response.headers.get_content_type() == "text/html"
        assert int(response.headers["Content-Length"]) == len(expected)
        assert response.read() == expected


def test_missing_head_returns_custom_404_headers_without_body(tmp_path):
    site = make_site(tmp_path)
    expected_length = (site / "404.html").stat().st_size
    with RunningServer(site) as base_url:
        request = urllib.request.Request(
            f"{base_url}/en/not-real",
            method="HEAD",
        )
        with pytest.raises(urllib.error.HTTPError) as caught:
            urllib.request.urlopen(request, timeout=5)

        response = caught.value
        assert response.code == 404
        assert response.headers.get_content_type() == "text/html"
        assert int(response.headers["Content-Length"]) == expected_length
        assert response.read() == b""


def test_server_requires_a_site_directory(tmp_path):
    site = tmp_path / "site"

    with pytest.raises(ValueError, match="Site directory"):
        create_server(site=site, bind="127.0.0.1", port=0)


def test_server_requires_a_readable_regular_404_file(tmp_path):
    site = tmp_path / "site"
    site.mkdir()

    with pytest.raises(ValueError, match="404.html is missing"):
        create_server(site=site, bind="127.0.0.1", port=0)

    (site / "404.html").mkdir()

    with pytest.raises(ValueError, match="readable regular file"):
        create_server(site=site, bind="127.0.0.1", port=0)


def test_quiet_server_records_its_disconnect_policy(tmp_path):
    server = create_server(site=make_site(tmp_path), quiet=True)
    try:
        assert isinstance(server, SiteThreadingHTTPServer)
        assert server.quiet is True
    finally:
        server.server_close()


def test_cli_rejects_non_loopback_bind():
    with pytest.raises(SystemExit):
        parse_args(["--site", "site", "--bind", "0.0.0.0"])


@pytest.mark.parametrize("port", ("-1", "65536"))
def test_cli_rejects_invalid_port(port):
    with pytest.raises(SystemExit):
        parse_args(["--site", "site", "--port", port])


def test_environment_site_supports_spaces_when_cli_omits_site(tmp_path, monkeypatch):
    site = make_site(tmp_path / "preview root with spaces")
    monkeypatch.setenv("SITE_PREVIEW_ROOT", str(site))

    args = parse_args([])

    assert resolve_site(args.site) == site.resolve()


def test_explicit_site_takes_priority_over_environment(tmp_path, monkeypatch):
    explicit_site = make_site(tmp_path / "explicit")
    environment_site = make_site(tmp_path / "environment")
    monkeypatch.setenv("SITE_PREVIEW_ROOT", str(environment_site))

    args = parse_args(["--site", str(explicit_site)])

    assert resolve_site(args.site) == explicit_site.resolve()


def test_site_resolution_requires_cli_or_environment(monkeypatch):
    monkeypatch.delenv("SITE_PREVIEW_ROOT", raising=False)

    args = parse_args([])

    with pytest.raises(ValueError, match="--site.*SITE_PREVIEW_ROOT"):
        resolve_site(args.site)
