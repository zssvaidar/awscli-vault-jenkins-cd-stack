

# vault write aws/config/root \
#     access_key="$AWS_ACCESS_KEY_ID" \
#     secret_key="$AWS_SECRET_ACCESS_KEY" \
#     region="ap-northeast-1"

# vault write aws/roles/test2 \
#     credential_type="assumed_role" \
#     role_arns="arn:aws:iam::142369633239:role/jenkins-role"

CREDS=$(vault read -format=json aws/creds/deploy-s3-role)

export AWS_ACCESS_KEY_ID=$(printf '%s\n' "$CREDS" | awk -F'"' '/"access_key"/ {print $4}')
export AWS_SECRET_ACCESS_KEY=$(printf '%s\n' "$CREDS" | awk -F'"' '/"secret_key"/ {print $4}')
export AWS_SESSION_TOKEN=$(printf '%s\n' "$CREDS" | awk -F'"' '/"security_token"/ {print $4}')


echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY
echo $AWS_SESSION_TOKEN


aws s3 cp myapp-43.tar.gz \
    s3://testing-node-app-142369633239/myapp-43.tar.gz \
    --region ap-northeast-1


# # vault read -format=json aws/creds/jenkins

# aws ec2 describe-instances   --region ap-northeast-1   --output json
# aws sts get-caller-identity
