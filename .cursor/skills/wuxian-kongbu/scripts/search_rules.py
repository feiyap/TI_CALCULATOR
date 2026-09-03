# -*- coding: utf-8 -*-
"""Search Infinite Horror 2.5R V108 rule corpus."""
from __future__ import print_function

import argparse
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CORPUS = os.path.join(ROOT, "corpus")
TOC = os.path.join(ROOT, "toc.md")

RULE_STEMS = [
    "\u6838\u5fc3\u89c4\u5219",
    "\u6838\u5fc3\u4e16\u754c\u89c2",
    "\u4e3b\u795e\u7a7a\u95f4",
    "\u89c4\u5219\u672f\u8bed\u89e3\u91ca",
    "\u672c\u8d28\u4e0e\u52a0\u503c\u7c7b\u578b",
    "\u6280\u80fd\u6982\u8ff0",
    "\u5c5e\u6027\u6982\u8ff0",
    "\u4e13\u957f\u6982\u8ff0",
    "\u4f24\u5bb3\u5904\u7406\u6d41\u7a0b",
    "\u751f\u547d\u503c",
    "\u573a\u666f\u4e0e\u52a8\u4f5c",
    "\u6218\u6597\u5f00\u59cb",
    "\u5e38\u7528\u52a8\u4f5c",
    "\u57fa\u56e0\u9501\u89c4\u5219",
    "\u7ecf\u9a8c\u503c\u89c4\u5219",
    "\u80fd\u91cf\u6c60",
    "\u80fd\u529b\u7b49\u7ea7\u4e0e\u5bf9\u6297",
    "\u4e0d\u826f\u72b6\u6001\u603b\u8ff0",
    "\u4e00\u4e9b\u5e38\u89c1\u95ee\u7b54",
    "\u4e00\u4e9b\u96f6\u6563\u89c4\u5219",
]


def configure_stdout():
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def read_text(path):
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        return f.read()


def iter_corpus():
    for name in sorted(os.listdir(CORPUS)):
        if name.endswith(".txt"):
            path = os.path.join(CORPUS, name)
            yield name, path, read_text(path)


def snippet_lines(text, keywords, ctx=1, max_hits=4):
    lines = text.splitlines()
    keys = [k.lower() for k in keywords]
    hits = []
    for i, line in enumerate(lines):
        low = line.lower()
        if any(k in low for k in keys):
            start = max(0, i - ctx)
            end = min(len(lines), i + ctx + 1)
            block = []
            for j in range(start, end):
                mark = ">" if j == i else " "
                block.append("%s%4d| %s" % (mark, j + 1, lines[j].rstrip()))
            hits.append("\n".join(block))
            if len(hits) >= max_hits:
                break
    return hits


def score_page(name, title, text, keywords):
    stem = os.path.splitext(name)[0]
    title_l = title.lower()
    stem_l = stem.lower()
    keys = [k.lower() for k in keywords]
    score = 0
    low = text.lower()
    for k in keys:
        if k == title_l or k == stem_l:
            score += 200
        elif k in title_l or k in stem_l:
            score += 80
        else:
            score += min(20, low.count(k))
    if stem in RULE_STEMS:
        score += 60
    if stem.startswith("2.5R_V"):
        score -= 50
    if (
        stem.endswith("\u7ea7\u67aa\u70ae")
        or stem.endswith("\u7ea7\u6b66\u5668")
        or stem.endswith("\u7ea7\u5947\u7269")
    ):
        score -= 20
    return score


def search(keywords, use_or=False, limit=12):
    ranked = []
    for name, path, text in iter_corpus():
        low = text.lower()
        title = text.splitlines()[0].lstrip("# ").strip() if text else name
        if use_or:
            ok = any(k.lower() in low for k in keywords)
        else:
            ok = all(k.lower() in low for k in keywords)
        if not ok:
            continue
        ranked.append((score_page(name, title, text, keywords), name, title, path, text))
    ranked.sort(key=lambda x: (-x[0], x[1]))
    results = []
    for _score, name, title, path, text in ranked[:limit]:
        hits = snippet_lines(text, keywords)
        results.append((name, title, hits, path))
    return results


def find_file(query):
    q = query.lower()
    exact = []
    fuzzy = []
    for name, path, text in iter_corpus():
        title = text.splitlines()[0].lstrip("# ").strip() if text else name
        stem = os.path.splitext(name)[0]
        blob = (stem + " " + title).lower()
        if q == stem.lower() or q == title.lower():
            exact.append((name, title, path, text))
        elif q in blob:
            fuzzy.append((name, title, path, text))
    return exact or fuzzy


def list_toc(filter_text=None):
    if not os.path.isfile(TOC):
        return "missing toc.md"
    text = read_text(TOC)
    if not filter_text:
        return text
    keys = filter_text.lower()
    lines = [ln for ln in text.splitlines() if keys in ln.lower()]
    return "\n".join(lines) if lines else "no toc match: %s" % filter_text


def write_last(text):
    path = os.path.join(ROOT, "_last_search.md")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
        if not text.endswith("\n"):
            f.write("\n")
    return path


def main(argv=None):
    configure_stdout()
    parser = argparse.ArgumentParser(description="Search Infinite Horror rules")
    parser.add_argument("keywords", nargs="*", help="keywords (AND)")
    parser.add_argument("--or", dest="use_or", action="store_true")
    parser.add_argument("--limit", type=int, default=12)
    parser.add_argument("--file", dest="filename")
    parser.add_argument("--list", dest="list_filter", nargs="?", const="")
    parser.add_argument("--max-chars", type=int, default=8000)
    args = parser.parse_args(argv)

    if not os.path.isdir(CORPUS):
        print("missing corpus: %s" % CORPUS)
        return 1

    if args.list_filter is not None:
        body = list_toc(args.list_filter or None)
        write_last(body)
        print(body)
        return 0

    if args.filename:
        found = find_file(args.filename)
        if not found:
            msg = "page not found: %s" % args.filename
            write_last(msg)
            print(msg)
            return 1
        chunks = []
        for name, title, path, text in found[:3]:
            chunks.append("=== %s (%s) ===" % (title, name))
            if len(text) > args.max_chars:
                chunks.append(text[: args.max_chars])
                chunks.append(
                    "\n...truncated %d chars, Read corpus/%s ..." % (len(text), name)
                )
            else:
                chunks.append(text)
            chunks.append("")
        body = "\n".join(chunks)
        write_last(body)
        print(body)
        return 0

    if not args.keywords:
        parser.print_help()
        return 1

    results = search(args.keywords, use_or=args.use_or, limit=args.limit)
    mode = "OR" if args.use_or else "AND"
    lines = [
        "query [%s] %s  hits %d (limit %d)\n"
        % (" ".join(args.keywords), mode, len(results), args.limit)
    ]
    if not results:
        lines.append("no hit. try shorter keywords or --list")
        body = "\n".join(lines)
        write_last(body)
        print(body)
        return 0
    for name, title, hits, path in results:
        lines.append("## %s" % title)
        lines.append("file: corpus/%s" % name)
        for h in hits:
            lines.append(h)
            lines.append("---")
        lines.append("")
    lines.append("full page: python scripts/search_rules.py --file NAME")
    body = "\n".join(lines)
    write_last(body)
    print(body)
    return 0


if __name__ == "__main__":
    sys.exit(main())
