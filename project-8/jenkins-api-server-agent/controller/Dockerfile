FROM jenkins/jenkins:lts-jdk21

USER root

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \
        git \
    && rm -rf /var/lib/apt/lists/*

ARG CACHE_BUST=1

RUN jenkins-plugin-cli --plugins \
    configuration-as-code \
    workflow-job \
    workflow-cps \
    workflow-step-api \
    workflow-api \
    hashicorp-vault-plugin \
    workflow-aggregator \
    git

USER jenkins
