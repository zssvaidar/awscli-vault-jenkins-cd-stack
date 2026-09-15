#!/usr/bin/env sh
# set -eu

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common/init.sh"
source config/.env

export VAULT_ADDR="http://127.0.0.1:8200"


export AWS_ACCESS_KEY_ID="$ACCESS_KEY_ID_JENKINS"
export AWS_SECRET_ACCESS_KEY="$SECRET_ACCESS_KEY_JENKINS"
# export AWS_SESSION_TOKEN="session_token"


echo "This script expects an already initialized and unsealed Vault."
echo
echo "1. vault operator init"
echo "2. vault operator unseal (repeat as required)"
echo "3. vault login <root-token>"
echo
echo "Then run:"
echo "  vault secrets enable -path=secret kv-v2"
echo "  vault kv put secret/myapp/config username=myuser password=super-secret-password"
echo "  vault policy write app-readonly /vault/policies/app-readonly.hcl"
echo "  vault auth enable approle"
echo "  vault write auth/approle/role/myapp token_policies=app-readonly"
