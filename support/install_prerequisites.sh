#!/bin/bash

function install_node {
    echo "Installing Nebula node prerequisites"
    apt install -y libmemcached-dev python3-pip cifs-utils zlib1g-dev python3-dev build-essential
    pip3 install pylibmc psutil psycopg2-binary pyyaml requests
}

function install_hub {
    echo "Installing hub prerequisites"
    pip3 install cherrypy jinja2 htmlmin
}

do_install_hub=0

read -p "Install hub prerquisites as well? " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    do_install_hub=1
fi

echo ""

install_node || exit 1

if [ $do_install_hub == 1 ]; then
    install_hub || exit 1
fi

