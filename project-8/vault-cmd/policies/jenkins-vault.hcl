# jenkins-vault.hcl

# jenkins approle(HashiCorp Vault Plugin) for geting temporary aws creds for deploy
path "aws/creds/jenkins" {
  capabilities = ["read"]
}