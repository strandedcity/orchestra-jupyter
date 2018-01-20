FROM jupyter/scipy-notebook

USER root

RUN jupyter nbextension install https://rawgit.com/strandedcity/orchestra-jupyter/master/dist/orchestra.js && \
	jupyter nbextension install https://rawgit.com/strandedcity/orchestra-jupyter/master/dist/orchestra-libraries.js && \
	jupyter nbextension enable orchestra

EXPOSE 8888

USER $NB_USER

