# -*- coding: utf-8 -*-
"""本地服务器：页面 + presets 文件夹读写。"""
from __future__ import print_function

import json
import os
import re
import sys
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import unquote

ROOT = os.path.dirname(os.path.abspath(__file__))
PRESETS = os.path.join(ROOT, "presets")
PORT = 8765
HOST = "127.0.0.1"


def ensure_presets():
    if not os.path.isdir(PRESETS):
        os.makedirs(PRESETS)


def safe_filename(name):
    name = (name or "").strip() or "未命名"
    name = re.sub(r'[<>:"/\\|?*]', "_", name)
    name = name.strip(" .")
    if not name.lower().endswith(".json"):
        name += ".json"
    return name[:120]


def unwrap(data, filename):
    if isinstance(data, dict) and "character" in data:
        return {
            "file": filename,
            "name": data.get("name") or data["character"].get("info", {}).get("name") or filename,
            "savedAt": data.get("savedAt") or "",
            "character": data["character"],
        }
    name = filename
    if isinstance(data, dict):
        name = data.get("info", {}).get("name") or filename
    return {"file": filename, "name": name, "savedAt": "", "character": data}


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        SimpleHTTPRequestHandler.__init__(self, *args, directory=ROOT, **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))

    def _send_json(self, obj, status=200):
        raw = json.dumps(obj, ensure_ascii=False, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def _read_json(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n) if n else b"{}"
        return json.loads(body.decode("utf-8"))

    def do_GET(self):
        path = unquote(self.path.split("?", 1)[0])
        if path.rstrip("/") == "/api/presets":
            ensure_presets()
            items = []
            for fn in sorted(os.listdir(PRESETS)):
                if not fn.lower().endswith(".json"):
                    continue
                fp = os.path.join(PRESETS, fn)
                try:
                    with open(fp, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    item = unwrap(data, fn)
                    items.append({
                        "file": item["file"],
                        "name": item["name"],
                        "savedAt": item["savedAt"],
                    })
                except Exception as e:
                    items.append({"file": fn, "name": fn, "savedAt": "", "error": str(e)})
            return self._send_json(items)
        if path.startswith("/api/presets/"):
            fn = safe_filename(unquote(path[len("/api/presets/"):]))
            fp = os.path.join(PRESETS, fn)
            if not os.path.isfile(fp):
                return self._send_json({"error": "找不到预设"}, 404)
            with open(fp, "r", encoding="utf-8") as f:
                data = json.load(f)
            return self._send_json(unwrap(data, fn))
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        path = unquote(self.path.split("?", 1)[0])
        if path.rstrip("/") != "/api/presets":
            self.send_error(404)
            return
        ensure_presets()
        payload = self._read_json()
        name = payload.get("name") or "未命名"
        overwrite = payload.get("file") or ""
        fn = safe_filename(overwrite or name)
        fp = os.path.join(PRESETS, fn)
        wrapped = {
            "name": name,
            "savedAt": datetime.now().isoformat(timespec="seconds"),
            "character": payload.get("character"),
        }
        with open(fp, "w", encoding="utf-8", newline="\n") as f:
            json.dump(wrapped, f, ensure_ascii=False, indent=2)
            f.write("\n")
        return self._send_json({"ok": True, "file": fn, "name": name, "savedAt": wrapped["savedAt"]})

    def do_DELETE(self):
        path = unquote(self.path.split("?", 1)[0])
        if not path.startswith("/api/presets/"):
            self.send_error(404)
            return
        fn = safe_filename(unquote(path[len("/api/presets/"):]))
        fp = os.path.join(PRESETS, fn)
        if not os.path.isfile(fp):
            return self._send_json({"error": "找不到预设"}, 404)
        os.remove(fp)
        return self._send_json({"ok": True, "file": fn})


def main():
    ensure_presets()
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer((HOST, PORT), Handler)
    url = "http://%s:%d/" % (HOST, PORT)
    print("角色加值计算器: " + url)
    print("预设目录: " + PRESETS)
    try:
        import webbrowser
        webbrowser.open(url)
    except Exception:
        pass
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n已停止")


if __name__ == "__main__":
    main()
