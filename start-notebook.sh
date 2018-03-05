#!/bin/bash
# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

# Install dnsmasq and configure it for wildcard *.orchestradatascience.com resolving to localhost
# This will let us generate a valid login cookie via curl from inside the docker container
echo "nameserver 127.0.0.1" > /etc/resolv.conf
sudo dnsmasq

# nginx needs to be started so we can proxy-forward 80 to 8888 from inside the container, to get a login cookie
nginx

set -e

su -c "set -e" -s /bin/bash jovyan
su -c ". /usr/local/bin/start.sh jupyter notebook $*" -s /bin/bash jovyan
