// Show/hide proposed Leios changes via a `?leios=on` query parameter.
//
// Content marked up as `<div class="leios">...</div>` is hidden by default and
// revealed when the URL carries `?leios=on`. A button in the top menu bar flips
// the parameter, and the choice is propagated onto internal links so it sticks
// while navigating the book. Sidebar entries that point at Leios content are
// highlighted with an icon and color. See the Styleguide for the convention.
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

    // For all internal links under `root`: keep the `?leios=on` choice sticky
    // (add it when on, drop it when off), and tag sidebar entries that point at
    // Leios content so they can be highlighted. Idempotent - safe to re-run as
    // the (JS-populated) sidebar appears or the state is toggled.
    const enhance = (root, on) => {
        for (const a of root.querySelectorAll("a[href]")) {
            const url = internal(a);
            if (!url) {
                continue;
            }
            // Match on the path only: the `?leios=on` we may have just added
            // must not make every link look like Leios content.
            if (a.closest(".chapter-item") && /leios/i.test(url.pathname)) {
                a.classList.add("leios-nav");
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
        button.textContent = on ? "⚡ Leios changes: on" : "⚡ Leios changes: off";
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
