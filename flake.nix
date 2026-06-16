{
  description = "Cardano Blueprint";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = inputs@{ self, flake-utils, nixpkgs, ... }:
    flake-utils.lib.eachSystem flake-utils.lib.defaultSystems (system:
      let
        pkgs = import nixpkgs { inherit system; };

        # mdbook-katex 0.9.x uses a fork of mdbook 0.4 and is incompatible with mdbook 0.5+.
        # 0.10.0-alpha (the latest release as of 2025-11-28) adds mdbook 0.5 support.
        # nixpkgs only carries 0.9.x, so we must supply it ourselves.
        # Use pre-built release binaries rather than building from source: nix's
        # fetch-cargo-vendor-util gets HTTP 403 from crates.io on GitHub Actions runners.
        # aarch64-linux has no pre-built binary; falls back to source build.
        mdbook-katex =
          let
            version = "0.10.0-alpha";
            baseUrl = "https://github.com/lzanini/mdbook-katex/releases/download/${version}-binaries";
            binaryFor = {
              "x86_64-linux" = {
                url = "${baseUrl}/mdbook-katex-v${version}-x86_64-unknown-linux-musl.tar.gz";
                hash = "sha256-BDyUr/Ch9TFbiJQ34JSENa2Pmx7SJUqEJVjT51PndKk=";
              };
              "x86_64-darwin" = {
                url = "${baseUrl}/mdbook-katex-v${version}-x86_64-apple-darwin.tar.gz";
                hash = "sha256-yMolN13xt3FKCM+1L8xNcBZdIZiZ8R00O8kHHS8vKmI=";
              };
              "aarch64-darwin" = {
                url = "${baseUrl}/mdbook-katex-v${version}-aarch64-apple-darwin.tar.gz";
                hash = "sha256-fM0TFBXc4w94s+vcxKLfQ0AhjJ14ckcOxUmKzg8gqkI=";
              };
            };
            binary = binaryFor.${pkgs.stdenv.hostPlatform.system} or null;
          in
          if binary != null then
            pkgs.stdenv.mkDerivation
              {
                pname = "mdbook-katex";
                inherit version;
                src = pkgs.fetchurl { inherit (binary) url hash; };
                dontUnpack = true;
                installPhase = ''
                  mkdir -p $out/bin
                  tar -xf $src -C $out/bin
                  chmod +x $out/bin/mdbook-katex
                '';
              }
          else
            pkgs.rustPlatform.buildRustPackage {
              pname = "mdbook-katex";
              inherit version;
              src = pkgs.fetchFromGitHub {
                owner = "lzanini";
                repo = "mdbook-katex";
                rev = "e4286f74c8b66fa95c5ba3556904748625a19373";
                hash = "sha256-etKoOLYxvUste3Ay+0Y5PGi1Lh6K/+0qz8ndc6XcQls=";
              };
              cargoHash = "sha256-LUHVGEvE22ITlmpuI+8qGBPTa7q8YssiLSfQnvGM4hw=";
            };

        formattingPkgs = with pkgs; [
          treefmt
          mdformat
          python3Packages.mdformat-footnote
          python3Packages.mdformat-gfm
          python3Packages.mdformat-myst # for latex math
          typos
        ];

        cddlPkgs = with pkgs; [
          bats
          cddl
          cddlc
        ];
      in
      rec {
        inherit inputs;
        legacyPackages = pkgs;
        defaultPackage = packages.mdbook;
        packages.mdbook = pkgs.stdenv.mkDerivation {
          name = "cardano-blueprint-book";
          src = ./.;
          buildInputs = with pkgs; [
            mdbook
            mdbook-mermaid
            mdbook-toc
          ] ++ [ mdbook-katex ];
          phases = [ "unpackPhase" "buildPhase" ];
          buildPhase = ''
            mdbook build -d $out
          '';
        };

        devShells.default = pkgs.mkShell {
          buildInputs = formattingPkgs ++ cddlPkgs;
        };

        devShells.book = pkgs.mkShell {
          inputsFrom = [ packages.mdbook ];
          buildInputs = formattingPkgs ++ cddlPkgs;
        };
      }
    );
}
