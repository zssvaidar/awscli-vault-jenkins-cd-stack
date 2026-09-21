#!/usr/bin/env sh
set -eu

export VAULT_ADDR="http://127.0.0.1:8200"

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
