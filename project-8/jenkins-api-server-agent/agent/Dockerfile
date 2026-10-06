FROM jenkins/inbound-agent:jdk21
ARG VAULT_VERSION=2.0.4

USER root

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        curl \ 
        wget \
        git \
        unzip \
        python3 \
        python3-pip \
        ansible \
        maven \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

    RUN curl -fsSL https://bun.sh/install | bash \
    && mv /root/.bun /opt/bun \
    && ln -s /opt/bun/bin/bun /usr/local/bin/bun \
    && ln -s /opt/bun/bin/bunx /usr/local/bin/bunx

RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install

RUN curl -fsSL "https://releases.hashicorp.com/vault/${VAULT_VERSION}/vault_${VAULT_VERSION}_linux_amd64.zip" \
        -o /tmp/vault.zip && \
    unzip /tmp/vault.zip -d /usr/local/bin && \
    rm /tmp/vault.zip && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

ARG CACHE_BUST=1
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    docker.io \
    docker-cli \
    nano \
    sudo \
    && rm -rf /var/lib/apt/lists/*

USER jenkins
