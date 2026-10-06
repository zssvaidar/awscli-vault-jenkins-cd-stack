# jenkins-vault.hcl

# jenkins approle(HashiCorp Vault Plugin) for geting temporary aws creds for deploy
path "aws/creds/jenkins" {
  capabilities = ["read"]
}

path "secret/data/ec2-agents/*" {
  capabilities = ["read"]
}

path "secret/metadata/ec2-agents/*" {
  capabilities = ["read"]
}

path "aws/creds/deploy-s3-role" {
  capabilities = ["read"]
}

path "aws/creds/deploy-ssm-role" {
  capabilities = ["read"]
}