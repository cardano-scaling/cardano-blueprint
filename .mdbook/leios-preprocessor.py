#!/usr/bin/env python3
"""mdBook preprocessor marking pages that carry proposed Leios changes.

A page declares itself as *entirely* proposed with front matter:

    ---
    leios: new
    ---

Such a page gets a banner prepended that is deliberately *outside* the Leios
toggle, so a reader arriving by direct link or from the search results is
warned even with the toggle off. Pages that merely contain a
`<div class="leios">` section need no front matter - they are detected here and
counted as `modified`.

Both kinds are published to the client as `window.LEIOS_PAGES`, which
`leios-toggle.js` uses to mark their entries in the table of contents. The
sidebar is the same on every page, so the manifest is appended to every
chapter.

See the Styleguide for the authoring conventions.
"""

import json
import re
import sys

FRONT_MATTER = re.compile(r"\A---[ \t]*\r?\n(.*?)\r?\n---[ \t]*\r?\n?", re.S)
# Deliberately loose: matches `leios: new` regardless of quoting/spacing.
LEIOS_KEY = re.compile(r"^\s*leios\s*:\s*[\"']?(\w+)[\"']?\s*$", re.M)

BANNER = """<div class="leios-banner">

This page describes **proposed** changes that are not yet part of the Cardano
mainnet. They are specified as part of
[Leios (CIP-0164)](https://github.com/cardano-foundation/CIPs/pull/1167), an
extension to the Ouroboros consensus protocol aimed at significantly increasing
transaction throughput. Details are subject to change.

</div>

"""


def output_path(path):
    """Source path of a chapter -> the page mdBook renders it to."""
    page = re.sub(r"\.md\Z", ".html", path)
    return re.sub(r"(\A|/)README\.html\Z", r"\1index.html", page)


def items_of(book):
    """The book's top-level items. mdBook 0.5 renamed `sections` to `items`."""
    return book.get("items", book.get("sections", []))


def chapters(item):
    """Yield every Chapter under an item, depth first.

    Non-chapter items are skipped. Those are a bare string in mdBook 0.5
    ("Separator") and a single-key object in 0.4 ({"Separator": null}).
    """
    if not isinstance(item, dict):
        return
    chapter = item.get("Chapter")
    if chapter is None:  # Separator or PartTitle
        return
    yield chapter
    for sub in chapter.get("sub_items", []):
        yield from chapters(sub)


def without_code(text):
    """Drop fenced blocks and inline spans, so that a page *documenting* the
    `<div class="leios">` convention is not mistaken for a page using it."""
    kept, fence = [], None
    for line in text.splitlines():
        stripped = line.lstrip()
        if fence is None:
            opening = re.match(r"(`{3,}|~{3,})", stripped)
            if opening:
                fence = opening.group(1)
            else:
                kept.append(line)
        elif stripped.startswith(fence[0] * 3):
            fence = None
    return re.sub(r"`[^`\n]*`", "", "\n".join(kept))


def classify(chapter):
    """Strip any front matter and report how the page relates to Leios."""
    content = chapter.get("content", "")
    kind = None

    match = FRONT_MATTER.match(content)
    if match:
        declared = LEIOS_KEY.search(match.group(1))
        if declared:
            kind = declared.group(1)
        chapter["content"] = content = content[match.end():]

    if kind is None and 'class="leios"' in without_code(content):
        kind = "modified"
    return kind


def main():
    if len(sys.argv) > 2 and sys.argv[1] == "supports":
        sys.exit(0)

    context, book = json.load(sys.stdin)

    all_chapters = [c for item in items_of(book) for c in chapters(item)]

    manifest = {}
    for chapter in all_chapters:
        kind = classify(chapter)
        # Draft chapters (no path) render no page, so they cannot be linked.
        if kind and chapter.get("path"):
            manifest[output_path(chapter["path"])] = kind
            if kind == "new":
                chapter["content"] = BANNER + chapter["content"]

    # The table of contents is identical on every page, so every page needs the
    # whole manifest to be able to mark it.
    inject = "\n\n<script>window.LEIOS_PAGES = %s;</script>\n" % json.dumps(
        manifest, sort_keys=True
    )
    for chapter in all_chapters:
        chapter["content"] += inject

    json.dump(book, sys.stdout)


if __name__ == "__main__":
    main()
