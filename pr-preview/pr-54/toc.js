// Populate the sidebar
//
// This is a script, and not included directly in the page, to control the total size of the book.
// The TOC contains an entry for each page, so if each page includes a copy of the TOC,
// the total size of the page becomes O(n**2).
class MDBookSidebarScrollbox extends HTMLElement {
    constructor() {
        super();
    }
    connectedCallback() {
        this.innerHTML = '<ol class="chapter"><li class="chapter-item expanded "><a href="introduction/index.html"><strong aria-hidden="true">1.</strong> Introduction</a></li><li class="chapter-item expanded "><a href="principles/index.html"><strong aria-hidden="true">2.</strong> Principles</a></li><li class="chapter-item expanded "><a href="network/index.html"><strong aria-hidden="true">3.</strong> Network</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="network/multiplexing.html"><strong aria-hidden="true">3.1.</strong> Multiplexing</a></li><li class="chapter-item expanded "><a href="network/mini-protocols.html"><strong aria-hidden="true">3.2.</strong> Mini-protocols</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="network/node-to-node/handshake/index.html"><strong aria-hidden="true">3.2.1.</strong> Handshake</a></li><li class="chapter-item expanded "><a href="network/node-to-node/chainsync/index.html"><strong aria-hidden="true">3.2.2.</strong> ChainSync</a></li><li class="chapter-item expanded "><a href="network/node-to-node/blockfetch/index.html"><strong aria-hidden="true">3.2.3.</strong> BlockFetch</a></li><li class="chapter-item expanded "><a href="network/node-to-node/txsubmission2/index.html"><strong aria-hidden="true">3.2.4.</strong> TxSubmission2</a></li><li class="chapter-item expanded "><a href="network/node-to-node/keep-alive/index.html"><strong aria-hidden="true">3.2.5.</strong> KeepAlive</a></li><li class="chapter-item expanded "><div><strong aria-hidden="true">3.2.6.</strong> PeerSharing</div></li></ol></li></ol></li><li class="chapter-item expanded "><a href="consensus/index.html"><strong aria-hidden="true">4.</strong> Consensus</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="consensus/chainvalid.html"><strong aria-hidden="true">4.1.</strong> Chain validity</a></li><li class="chapter-item expanded "><a href="consensus/chainsel.html"><strong aria-hidden="true">4.2.</strong> Chain selection</a></li><li class="chapter-item expanded "><a href="consensus/forging.html"><strong aria-hidden="true">4.3.</strong> Forging new blocks</a></li><li class="chapter-item expanded "><a href="consensus/multiera.html"><strong aria-hidden="true">4.4.</strong> Multi-era considerations</a></li></ol></li><li class="chapter-item expanded "><a href="storage/index.html"><strong aria-hidden="true">5.</strong> Storage</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="storage/cardano-node-chaindb/index.html"><strong aria-hidden="true">5.1.</strong> cardano-node&#39;s ChainDB</a></li></ol></li><li class="chapter-item expanded "><a href="mempool/index.html"><strong aria-hidden="true">6.</strong> Mempool</a></li><li class="chapter-item expanded "><a href="ledger/index.html"><strong aria-hidden="true">7.</strong> Ledger</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="ledger/transaction-fee.html"><strong aria-hidden="true">7.1.</strong> Transaction fee</a></li><li class="chapter-item expanded "><a href="ledger/block-validation.html"><strong aria-hidden="true">7.2.</strong> Block Validation</a></li></ol></li><li class="chapter-item expanded "><a href="plutus/index.html"><strong aria-hidden="true">8.</strong> Plutus</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="plutus/syntax.html"><strong aria-hidden="true">8.1.</strong> Syntax</a></li><li class="chapter-item expanded "><a href="plutus/builtin.html"><strong aria-hidden="true">8.2.</strong> Builtin Types and Functions</a></li><li class="chapter-item expanded "><a href="plutus/cek.html"><strong aria-hidden="true">8.3.</strong> The CEK Machine</a></li><li class="chapter-item expanded "><a href="plutus/serialization.html"><strong aria-hidden="true">8.4.</strong> Serialization</a></li></ol></li><li class="chapter-item expanded "><a href="client/index.html"><strong aria-hidden="true">9.</strong> Client interfaces</a></li><li><ol class="section"><li class="chapter-item expanded "><a href="client/node-to-client/index.html"><strong aria-hidden="true">9.1.</strong> NTC</a></li><li><ol class="section"><li class="chapter-item expanded "><div><strong aria-hidden="true">9.1.1.</strong> Handshake</div></li><li class="chapter-item expanded "><a href="client/node-to-client/state-query/index.html"><strong aria-hidden="true">9.1.2.</strong> LocalStateQuery</a></li><li class="chapter-item expanded "><div><strong aria-hidden="true">9.1.3.</strong> LocalTxSubmission</div></li><li class="chapter-item expanded "><div><strong aria-hidden="true">9.1.4.</strong> TxMonitor</div></li><li class="chapter-item expanded "><div><strong aria-hidden="true">9.1.5.</strong> LocalChainSync</div></li></ol></li><li class="chapter-item expanded "><a href="client/utxo-rpc/index.html"><strong aria-hidden="true">9.2.</strong> UTxO-RPC</a></li></ol></li><li class="chapter-item expanded "><a href="codecs/index.html"><strong aria-hidden="true">10.</strong> Codec basics</a></li><li class="chapter-item expanded affix "><li class="spacer"></li><li class="chapter-item expanded "><a href="styleguide.html"><strong aria-hidden="true">11.</strong> Styleguide</a></li><li class="chapter-item expanded "><a href="CONTRIBUTING.html"><strong aria-hidden="true">12.</strong> Contributing</a></li><li class="chapter-item expanded "><a href="logbook.html"><strong aria-hidden="true">13.</strong> Logbook</a></li><li class="chapter-item expanded "><a href="logo/index.html"><strong aria-hidden="true">14.</strong> Logo</a></li><li class="chapter-item expanded "><a href="LICENSE.html"><strong aria-hidden="true">15.</strong> License</a></li></ol>';
        // Set the current, active page, and reveal it if it's hidden
        let current_page = document.location.href.toString().split("#")[0].split("?")[0];
        if (current_page.endsWith("/")) {
            current_page += "index.html";
        }
        var links = Array.prototype.slice.call(this.querySelectorAll("a"));
        var l = links.length;
        for (var i = 0; i < l; ++i) {
            var link = links[i];
            var href = link.getAttribute("href");
            if (href && !href.startsWith("#") && !/^(?:[a-z+]+:)?\/\//.test(href)) {
                link.href = path_to_root + href;
            }
            // The "index" page is supposed to alias the first chapter in the book.
            if (link.href === current_page || (i === 0 && path_to_root === "" && current_page.endsWith("/index.html"))) {
                link.classList.add("active");
                var parent = link.parentElement;
                if (parent && parent.classList.contains("chapter-item")) {
                    parent.classList.add("expanded");
                }
                while (parent) {
                    if (parent.tagName === "LI" && parent.previousElementSibling) {
                        if (parent.previousElementSibling.classList.contains("chapter-item")) {
                            parent.previousElementSibling.classList.add("expanded");
                        }
                    }
                    parent = parent.parentElement;
                }
            }
        }
        // Track and set sidebar scroll position
        this.addEventListener('click', function(e) {
            if (e.target.tagName === 'A') {
                sessionStorage.setItem('sidebar-scroll', this.scrollTop);
            }
        }, { passive: true });
        var sidebarScrollTop = sessionStorage.getItem('sidebar-scroll');
        sessionStorage.removeItem('sidebar-scroll');
        if (sidebarScrollTop) {
            // preserve sidebar scroll position when navigating via links within sidebar
            this.scrollTop = sidebarScrollTop;
        } else {
            // scroll sidebar to current active section when navigating via "next/previous chapter" buttons
            var activeSection = document.querySelector('#sidebar .active');
            if (activeSection) {
                activeSection.scrollIntoView({ block: 'center' });
            }
        }
        // Toggle buttons
        var sidebarAnchorToggles = document.querySelectorAll('#sidebar a.toggle');
        function toggleSection(ev) {
            ev.currentTarget.parentElement.classList.toggle('expanded');
        }
        Array.from(sidebarAnchorToggles).forEach(function (el) {
            el.addEventListener('click', toggleSection);
        });
    }
}
window.customElements.define("mdbook-sidebar-scrollbox", MDBookSidebarScrollbox);
