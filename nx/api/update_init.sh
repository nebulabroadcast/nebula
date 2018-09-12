#!/bin/bash

echo "" > __init__.py

for FILE in *.py; do
    if [ "${FILE}" == "__init__.py" ]; then
        continue
    fi
    echo "from .`basename ${FILE%.*}` import *" >> __init__.py
done
