#!/usr/bin/env bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR
make init
PATH="$DIR/node_modules/.bin:$PATH" make js
isso -c ../isso.ini run