
vault write aws/roles/jenkins \
    credential_type="assumed_role" \
    role_arns="arn:aws:iam::142369633239:role/jenkins-role"

vault write aws/roles/deploy-s3-role \
    credential_type="assumed_role" \
    role_arns="arn:aws:iam::142369633239:role/jenkins-role"

vault write aws/roles/deploy-ssm-role \
    credential_type="assumed_role" \
    role_arns="arn:aws:iam::142369633239:role/jenkins-role"
