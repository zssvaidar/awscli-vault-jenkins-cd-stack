## agent generated docs for understanding internals) project itself is written by me
## purpose of this project is creation of my CD stack
## TODO's:
### - division of jenkins pipeline into deployment scripts
### - configuring ec2, ecs instance
### - service management, alert service down
### - log collector like loki
### - running k8s,k3s on ec2

# AWS CLI + Vault + Jenkins CD Stack

Short-lived AWS credentials for Jenkins deployments — no long-lived keys on the agent.

## What this does

- Spins up a Jenkins controller + inbound agent via Docker Compose, configured automatically with JCasC (admin user, security realm, and the `docker-agent` node — no manual setup wizard)
- Bakes the agent image with everything CD needs: AWS CLI, Vault CLI, Docker, Ansible
- Creates a dedicated `jenkins` IAM user and a `jenkins-role` IAM role, scoped to EC2 + RDS, via trust policy / assume-role policy templates
- Configures Vault's AWS secrets engine with the account's root credentials, so Vault — not Jenkins — holds the long-lived keys
- Defines a Vault role (`aws/roles/jenkins`) that maps to `jenkins-role`, letting Vault mint **temporary STS credentials** on demand
- Locks down access with a Vault policy so the Jenkins agent can only `read` from `aws/creds/jenkins` — nothing else
- Result: pipelines call Vault at deploy time, get short-lived `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_SESSION_TOKEN`, run their AWS actions, and the credentials expire on their own

## Stack

- **Jenkins** — controller/agent, JCasC-provisioned
- **HashiCorp Vault** — AWS secrets engine, dev-mode file storage
- **AWS IAM** — dedicated deploy user/role, least-privilege policies
- **Docker Compose** — orchestrates controller + agent

## Related projects in this repo

- **Twenty CRM** (`project-4/twenty-server`) — an open-source CRM (Twenty), run here via Docker Compose as the backend/server instance.
- **twenty-app** (`project-1/twenty-app`) — a custom app/extension built on the `twenty-sdk`, meant to be published into a Twenty CRM instance via npm trusted publishing.
- **Medusa** (`project-6/medusa-backend-store`) — an open-source headless commerce (ecommerce) engine; this is the DTC starter monorepo with a Medusa backend and Next.js storefront (cart, checkout, orders, customer accounts).