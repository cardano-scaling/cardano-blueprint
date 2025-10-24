#!/usr/bin/env bash
set -uo pipefail

# Check consistency of .cbor files against .cddl in the repository.

# TODO: check whether 'cddl' is installed

# Check that given cbor is valid against all given cddls files concatenated
function check_cbor() {
    local cbor_file=$1
    shift
    local cddl_files=("$@")
    local cddl=$(cat "${cddl_files[@]}")
    # NOTE: cddl spams stdout on invalid cbor, so we drop everything after '-- cannot complete'
    out=$(cddl <(echo "${cddl}") validate <(xxd -r -p "${cbor_file}") 2> /dev/null | \
            awk -v RS='--' 'NR==1{print} NR==2{exit}') 
    if [ $? -ne 0 ]; then
        echo "Invalid cbor file: ${cbor_file}"
        echo "Error: ${out%--*}"
        printf "CDDL: \n${cddl}"
        exit 1
    fi
}

cd src/api
check_cbor examples/getSystemStart/query.cbor cddl/local-state-query.cddl cddl/getSystemStart.cddl
check_cbor examples/getSystemStart/result.cbor cddl/local-state-query.cddl cddl/getSystemStart.cddl
