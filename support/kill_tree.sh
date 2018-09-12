#!/bin/bash

killtree() {
    local _pid=$1
    local _sig=${2-TERM}
    for _child in $(ps -o pid --no-headers --ppid ${_pid}); do
        killtree ${_child} ${_sig}
    done
    kill -${_sig} ${_pid} 2> /dev/null
}

if [ $# -eq 0 -o $# -gt 2 ]; then
    exit 1
fi

killtree $@
