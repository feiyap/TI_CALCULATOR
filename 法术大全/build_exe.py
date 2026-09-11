# -*- coding: utf-8 -*-
"""将 HTML / JSON 打包为单个 exe。"""
from __future__ import print_function

import os
import shutil
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
HTML_SRC = os.path.join(HERE, "通用魔法分类目录.html")
JSON_SRC = os.path.join(HERE, "spells.json")
APP = os.path.join(HERE, "catalog_app.py")
WORK = os.path.join(HERE, "_pyi_work")
DIST = os.path.join(HERE, "_pyi_dist")
SPEC = os.path.join(HERE, "catalog_app.spec")


def main():
    if not os.path.isfile(HTML_SRC) or not os.path.isfile(JSON_SRC):
        raise SystemExit("缺少 HTML 或 JSON，无法打包。")
    for d in (WORK, DIST):
        if os.path.isdir(d):
            shutil.rmtree(d, ignore_errors=True)
    sep = ";" if os.name == "nt" else ":"
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--clean",
        "--onefile",
        "--windowed",
        "--name", "通用魔法分类目录",
        "--distpath", DIST,
        "--workpath", WORK,
        "--specpath", HERE,
        "--add-data", HTML_SRC + sep + ".",
        "--add-data", JSON_SRC + sep + ".",
        "--hidden-import", "webview",
        "--hidden-import", "webview.platforms.edgechromium",
        "--hidden-import", "webview.platforms.winforms",
        APP,
    ]
    print(" ".join(cmd))
    subprocess.check_call(cmd)
    built = os.path.join(DIST, "通用魔法分类目录.exe")
    dest = os.path.join(HERE, "通用魔法分类目录.exe")
    shutil.copy2(built, dest)
    print("exe:", dest)
    print("size:", os.path.getsize(dest))


if __name__ == "__main__":
    main()
