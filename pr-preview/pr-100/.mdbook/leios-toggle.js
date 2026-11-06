// Show/hide proposed Leios changes via a `?leios=on` query parameter.
//
// Content marked up as `<div class="leios">...</div>` is hidden by default and
// revealed when the URL carries `?leios=on`. A button in the top menu bar flips
// the parameter, and the choice is propagated onto internal links so it sticks
// while navigating the book. Pages carrying Leios content are listed in
// `window.LEIOS_PAGES`, built by .mdbook/leios-preprocessor.py: entries for a
// `new` (wholly proposed) page are hidden while off, entries for a `modified`
// page stay put, and both are highlighted while on. See the Styleguide for the
// conventions.
(() => {
    "use strict";

    const PARAM = "leios";
    const ON = "on";
    const CLASS = "leios-on";

    const isOn = () =>
        new URLSearchParams(window.location.search).get(PARAM) === ON;

    // Reflect the state on <html> so CSS can show/hide the marked blocks.
    const apply = (on) =>
        document.documentElement.classList.toggle(CLASS, on);

    const internal = (a) => {
        const raw = a.getAttribute("href");
        if (!raw || /^(#|mailto:|tel:|javascript:)/i.test(raw)) {
            return null;
        }
        let url;
        try {
            url = new URL(a.href, window.location.href);
        } catch {
            return null;
        }
        return url.origin === window.location.origin ? url : null;
    };

    // How the page a link points at relates to Leios: "new", "modified" or
    // undefined. Keys of the manifest are page paths relative to the book root,
    // so match them against the end of the link's path.
    const kindOf = (url) => {
        const pages = window.LEIOS_PAGES;
        if (!pages) {
            return undefined;
        }
        const path = url.pathname;
        for (const page in pages) {
            if (path === page || path.endsWith("/" + page)) {
                return pages[page];
            }
        }
        return undefined;
    };

    // Tag a sidebar entry pointing at Leios content, so CSS can highlight it
    // (on the link) and, for a wholly proposed page, hide it while the toggle
    // is off (on the list item). mdBook nests sub-chapters inside the parent
    // `<li class="chapter-item">`, so hiding it takes any children with it.
    const tagChapter = (a, url, kind) => {
        const item = a.closest(".chapter-item");
        if (!item) {
            return;
        }
        a.classList.add("leios-nav");
        // A `modified` page documents the current protocol too, so it must stay
        // listed. Never hide the page currently being read either - the reader
        // would lose their place in the table of contents.
        if (kind === "new" && url.pathname !== window.location.pathname) {
            item.classList.add("leios-chapter");
        }
    };

    // For all internal links under `root`: keep the `?leios=on` choice sticky
    // (add it when on, drop it when off), and tag sidebar entries that point at
    // Leios content so they can be highlighted and hidden. Idempotent - safe to
    // re-run as the (JS-populated) sidebar appears or the state is toggled.
    const enhance = (root, on) => {
        for (const a of root.querySelectorAll("a[href]")) {
            const url = internal(a);
            if (!url) {
                continue;
            }
            const kind = kindOf(url);
            if (kind) {
                tagChapter(a, url, kind);
            }
            if (on) {
                url.searchParams.set(PARAM, ON);
            } else {
                url.searchParams.delete(PARAM);
            }
            a.setAttribute("href", url.pathname + url.search + url.hash);
        }
    };

    let button;

    const updateButton = (on) => {
        if (!button) {
            return;
        }
        button.setAttribute("aria-pressed", on ? "true" : "false");
        button.title = on
            ? "Hide proposed Leios changes"
            : "Show proposed Leios changes";
        button.textContent = on ? "🌊 Leios changes: on" : "🌊 Leios changes: off";
    };

    const setState = (on) => {
        const url = new URL(window.location.href);
        if (on) {
            url.searchParams.set(PARAM, ON);
        } else {
            url.searchParams.delete(PARAM);
        }
        // Update the address bar without reloading; CSS handles the rest.
        history.replaceState(null, "", url.pathname + url.search + url.hash);
        apply(on);
        enhance(document, on);
        updateButton(on);
    };

    const insertButton = (on) => {
        // Match by class, not id: mdBook 0.5+ renamed the bar to
        // `#mdbook-menu-bar` but kept the `.menu-bar` / `.right-buttons` classes.
        const container =
            document.querySelector(".menu-bar .right-buttons") ||
            document.querySelector(".menu-bar .left-buttons") ||
            document.querySelector(".menu-bar");
        if (!container) {
            return;
        }
        button = document.createElement("button");
        button.id = "leios-toggle";
        button.type = "button";
        button.addEventListener("click", () => setState(!isOn()));
        container.appendChild(button);
        updateButton(on);
    };

    const init = () => {
        const on = isOn();
        apply(on);
        enhance(document, on);
        insertButton(on);

        // The sidebar is populated by mdBook's own JS after load, so re-enhance
        // it whenever its contents change.
        const sidebar = document.querySelector("#mdbook-sidebar, .sidebar");
        if (sidebar) {
            new MutationObserver(() => enhance(sidebar, isOn())).observe(
                sidebar,
                { childList: true, subtree: true },
            );
        }
    };

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
