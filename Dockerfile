FROM jupyter/scipy-notebook

USER root

ADD docker-install-orchestra.sh /tmp/
RUN /tmp/docker-install-orchestra.sh

EXPOSE 8888

USER $NB_USER

