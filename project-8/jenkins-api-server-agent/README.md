# Automatic Jenkins Controller and Agent

This setup starts:

- Jenkins Controller
- Jenkins inbound agent
- Automatic Jenkins configuration using JCasC

## Configure

Edit `.env`:

```env
JENKINS_ADMIN_ID=admin
JENKINS_ADMIN_PASSWORD=admin123
JENKINS_AGENT_SECRET=change-this-to-a-long-random-secret
```

Generate a stronger secret:

```bash
openssl rand -hex 32
```

## Start

```bash
docker compose up -d --build
```

Open Jenkins:

http://localhost:8080

Login using the values from `.env`.

## Agent

The `docker-agent` node is automatically created by JCasC.

The agent container automatically starts and connects using:

- `JENKINS_URL`
- `JENKINS_AGENT_NAME=docker-agent`
- `JENKINS_SECRET`

Check:

```bash
docker logs -f jenkins-agent
```

## Important

If you change JCasC configuration after Jenkins has already started, restart:

```bash
docker compose restart jenkins-controller
```

For a clean Jenkins installation:

```bash
docker compose down -v
docker compose up -d --build
```
