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

        formattingPkgs = with pkgs; [
          treefmt
          mdformat
          python3Packages.mdformat-footnote
          python3Packages.mdformat-gfm
          python3Packages.mdformat-myst # for latex math
          typos
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
            mdbook-katex
            mdbook-alerts
            mdbook-toc
          ];
          phases = [ "unpackPhase" "buildPhase" ];
          buildPhase = ''
            mdbook build -d $out
          '';
        };

        devShells.default = pkgs.mkShell {
          inputsFrom = [ packages.mdbook ];
          buildInputs = formattingPkgs ++ [
            pkgs.cddl
            pkgs.xxd
          ];
        };
      }
    );
}
