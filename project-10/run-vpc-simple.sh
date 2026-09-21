# ln -s ../project-9/wrapper wrapper

# source "wrapper/common/init.sh"
# source "wrapper/config/.env"

# unset_aws
# set_root
# whoami

# # vpc-network/provision-all.sh $1
# # vpc-network/show-network.sh $1
# # vpc-network/teardown.sh $1

# AWS_REGION="${AWS_REGION:-ap-northeast-1}"
# CIDR="${2:-10.0.0.0/16}"
# Purpose=testing

# create() {
#     VPC_ID=$(aws ec2 create-vpc \
#         --region "$AWS_REGION" \
#         --cidr-block "$CIDR" \
#         --tag-specifications "ResourceType=vpc, \
#         Tags=[{Key=Purpose,Value=$Purpose}]" \
#         --query 'Vpc.VpcId' --output text)
#     echo $VPC_ID

#     BASTION_SG=$(aws ec2 create-security-group --group-name bastion-sg \
#         --description "Bastion host - SSH jump box" --vpc-id $VPC_ID \
#         --query 'GroupId' --output text \
#         --tag-specifications "ResourceType=security-group, \
#         Tags=[{Key=Purpose,Value=$Purpose}]"
#     )

#     APP_SG=$(aws ec2 create-security-group --group-name app-sg \
#         --description "Application tier" --vpc-id $VPC_ID \
#         --query 'GroupId' --output text \
#         --tag-specifications "ResourceType=security-group, \
#         Tags=[{Key=Purpose,Value=$Purpose}]"
#     )

#     DB_SG=$(aws ec2 create-security-group --group-name db-sg \
#         --description "Database tier" --vpc-id $VPC_ID \
#         --query 'GroupId' --output text \
#         --tag-specifications "ResourceType=security-group, \
#         Tags=[{Key=Purpose,Value=$Purpose}]"
#     )

#     echo $BASTION_SG $APP_SG $DB_SG
# }

# delete() {
#     for sg in $(aws ec2 describe-security-groups \
#     --filters "Name=tag:Purpose,Values=$Purpose" \
#     --query 'SecurityGroups[*].GroupId' \
#     --output text); do

#         echo "Deleting $sg"
#         aws ec2 delete-security-group --group-id "$sg"
#     done

#     for vpc in $(aws ec2 describe-vpcs \
#     --filters "Name=tag:Purpose,Values=$Purpose" \
#     --query 'Vpcs[*].VpcId' \
#     --output text); do

#         echo "Deleting $vpc"
#         aws ec2 delete-vpc --vpc-id "$vpc"
#     done
# }

# create
# delete