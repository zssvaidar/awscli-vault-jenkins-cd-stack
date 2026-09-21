
VPC_ID=$(aws ec2 describe-vpcs \
  --region "$AWS_REGION" \
  --filters "Name=is-default,Values=true" \
  --query 'Vpcs[0].VpcId' \
  --output text)


https://chatgpt.com/c/6aac1780-67bc-83e8-830e-61ed1abeb325
set_secgroup() {
    aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID_CREATOR"
    aws configure set aws_secret_access_key "$SECRET_ACCESS_KEY_CREATOR"
    aws configure set region "ap-northeast-1"

    echo ran set security group
}