# -*- coding: utf-8 -*-
"""通用魔法分类目录桌面启动器。"""
from __future__ import print_function

import os
import sys
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


def resource_dir():
    if getattr(sys, "frozen", False):
        return sys._MEIPASS
    return os.path.dirname(os.path.abspath(__file__))


def find_html():
    base = resource_dir()
    for name in ("通用魔法分类目录.html", "index.html"):
        path = os.path.join(base, name)
        if os.path.isfile(path):
            return path, name
    raise FileNotFoundError("未找到通用魔法分类目录.html")


class QuietHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super(QuietHandler, self).__init__(*args, directory=resource_dir(), **kwargs)

    def log_message(self, format, *args):
        return


def start_server():
    httpd = ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd.server_address[1]


def open_webview(url):
    import webview

    webview.create_window(
        "无限恐怖 · 通用魔法分类目录",
        url,
        width=1100,
        height=840,
        min_size=(720, 520),
    )
    webview.start()


def open_browser_window(url):
    import tkinter as tk
    from tkinter import ttk

    webbrowser.open(url)
    root = tk.Tk()
    root.title("通用魔法分类目录")
    root.geometry("380x130")
    root.resizable(False, False)
    ttk.Label(
        root,
        text="目录已在浏览器中打开。\n关闭本窗口将退出程序。",
        justify="center",
        font=("Microsoft YaHei", 11),
    ).pack(expand=True, padx=16, pady=16)
    root.mainloop()


def show_error(message):
    try:
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()
        messagebox.showerror("通用魔法分类目录", message)
        root.destroy()
    except Exception:
        sys.stderr.write(message + "\n")


def main():
    try:
        _path, name = find_html()
        port = start_server()
        url = "http://127.0.0.1:%d/%s" % (port, name)
        try:
            open_webview(url)
        except Exception:
            open_browser_window(url)
    except Exception as exc:
        show_error("启动失败：%s" % exc)
        sys.exit(1)


if __name__ == "__main__":
    main()
