# aws iam create-role \
#   --role-name jenkins-role \
#   --assume-role-policy-document file://trust-policy.json

# aws iam attach-role-policy \
#   --role-name jenkins-role \
#   --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

# aws iam attach-role-policy \
#   --role-name jenkins-role \
#   --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess

# aws iam put-user-policy \
#   --user-name jenkins \
#   --policy-name AssumeRdsEc2Role \
#   --policy-document file://assume-role-policy.json

# if you edit role the user that assumed will have more capabilities
# if i assume role and policy changes, token is invalid

# \1 create user jenkins
# \2 create role for user
# \3 add ec2, s3, rds access to role
# \4 change to jenkins
# \5 assume role assigned to user
# \6 using AccessKeyId, SecretAccessKey perform actions

ROLE_ARN="arn:aws:iam::142369633239:role/jenkins-role"
SESSION_NAME="jenkins-session"

CREDS=$(aws sts assume-role \
  --role-arn "$ROLE_ARN" \
  --role-session-name "$SESSION_NAME")

# echo $CREDS
export AWS_ACCESS_KEY_ID=$(printf '%s\n' "$CREDS" | awk -F'"' '/"AccessKeyId"/ {print $4}')
export AWS_SECRET_ACCESS_KEY=$(printf '%s\n' "$CREDS" | awk -F'"' '/"SecretAccessKey"/ {print $4}')
export AWS_SESSION_TOKEN=$(printf '%s\n' "$CREDS" | awk -F'"' '/"SessionToken"/ {print $4}')

aws ec2 describe-instances   --region ap-northeast-1   --output json
aws sts get-caller-identity