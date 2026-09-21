echo 'running automation...'

source "wrapper/common/init.sh"
source "wrapper/config/.env"

unset AWS_ACCESS_KEY_ID
unset AWS_SECRET_ACCESS_KEY
unset AWS_SESSION_TOKEN

set_jenkins
whoami

ROLE_ARN="arn:aws:iam::142369633239:role/jenkins-role"
SESSION_NAME="jenkins-session"

CREDS=$(aws sts assume-role \
  --role-arn "$ROLE_ARN" \
  --role-session-name "$SESSION_NAME")

export AWS_ACCESS_KEY_ID=$(printf '%s\n' "$CREDS" | awk -F'"' '/"AccessKeyId"/ {print $4}')
export AWS_SECRET_ACCESS_KEY=$(printf '%s\n' "$CREDS" | awk -F'"' '/"SecretAccessKey"/ {print $4}')
export AWS_SESSION_TOKEN=$(printf '%s\n' "$CREDS" | awk -F'"' '/"SessionToken"/ {print $4}')
export VAULT_ADDR="http://127.0.0.1:8200"
