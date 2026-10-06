export VAULT_ADDR=http://127.0.0.1:8200
vault read auth/approle/role/jenkins/role-id
vault write -f auth/approle/role/jenkins/secret-id