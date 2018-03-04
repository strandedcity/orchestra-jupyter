#!/bin/bash
# Copyright (c) Jupyter Development Team.
# Distributed under the terms of the Modified BSD License.

echo "nameserver 127.0.0.1" > /etc/resolv.conf

sudo dnsmasq

#su - jovyan

set -e

su -c "set -e" -s /bin/bash jovyan
su -c ". /usr/local/bin/start.sh jupyter notebook $*" -s /bin/bash jovyan

#if [[ ! -z "${JUPYTERHUB_API_TOKEN}" ]]; then
#  # launched by JupyterHub, use single-user entrypoint
#  exec /usr/local/bin/start-singleuser.sh $*
#else
#  . /usr/local/bin/start.sh jupyter notebook $*
#fi
