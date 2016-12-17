#!/usr/bin/env bash

out="$1"
shift
err="$1"
shift
cmd="$1"
shift

"$cmd" "$@" 1>> "$out" 2>> "$err"