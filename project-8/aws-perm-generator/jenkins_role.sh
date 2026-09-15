SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common/init.sh"
source config/.env

set_root
whoami

export AWS_ARN_USER_JENKINS

# set_1 = ec2, rds
# set_2 = ec2, s3

ROLE_NAME=jenkins-role
POLICY_NAME=trust-policy
RESOURCE_SET=set_1
envsubst '${AWS_ARN_USER_JENKINS}' < templates/trust-policy.json.template > $POLICY_NAME.json

create_role "$ROLE_NAME" "$POLICY_NAME" "$RESOURCE_SET"


export AWS_ARN_ROLE_JENKINS

USER=jenkins
POLICY_NAME_LABEL=AssumeSet1Role
POLICY_NAME=assume-role-policy
envsubst '${AWS_ARN_ROLE_JENKINS}' < templates/assume-role-policy.json.template > $POLICY_NAME.json

# after running this command user able to assume this role 
set_assume_role_policy "$USER" "$POLICY_NAME_LABEL" "$POLICY_NAME"

set_jenkins

aws sts get-caller-identity
aws ec2 describe-instances   --region ap-northeast-1   --output json
