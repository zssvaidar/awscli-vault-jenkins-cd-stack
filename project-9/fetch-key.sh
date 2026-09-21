#!/usr/bin/env bash
# Fetches a previously generated agent keypair's private key from Vault into a local file.
# Used by ec2-deploy/Jenkinsfile at deploy time (so the key never sits in Jenkins as a
# static credential) and can be used the same way for a manual ssh.
#
# Usage: ./fetch-key.sh <date_name> [output_path]   (output_path defaults to ./agent_key)
# Required: vault CLI logged in (VAULT_ADDR + token/approle already set up)
# Optional env vars: VAULT_KV_PATH (default secret/ec2-agents)
set -euo pipefail

vault write auth/approle/login \
  role_id="e4bd5966-f142-5f2f-3d1e-55ee523e689d" \
  secret_id="51caeeb1-2efd-f086-848a-076bdcf9b13c"

DATE_NAME="${1:?usage: fetch-key.sh <date_name> [output_path]}"
OUTPUT_PATH="${2:-./agent_key}"
VAULT_KV_PATH="${VAULT_KV_PATH:-secret/jenkins}"

vault kv get -field=private_key "$VAULT_KV_PATH/$DATE_NAME" > "$OUTPUT_PATH"
chmod 600 "$OUTPUT_PATH"

echo "wrote private key for $DATE_NAME to $OUTPUT_PATH"

CREDS=$(vault read -format=json aws/creds/jenkins)

export AWS_ACCESS_KEY_ID=$(printf '%s\n' "$CREDS" | awk -F'"' '/"access_key"/ {print $4}')
export AWS_SECRET_ACCESS_KEY=$(printf '%s\n' "$CREDS" | awk -F'"' '/"secret_key"/ {print $4}')
export AWS_SESSION_TOKEN=$(printf '%s\n' "$CREDS" | awk -F'"' '/"security_token"/ {print $4}')

aws ec2 describe-instances   --region ap-northeast-1   --output json