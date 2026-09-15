#!/usr/bin/env bash

set_root() {
    aws configure set aws_access_key_id "$AWS_ACCESS_KEY_ID_CREATOR"
    aws configure set aws_secret_access_key "$SECRET_ACCESS_KEY_CREATOR"
    aws configure set region "ap-northeast-1"

    echo ran set root
}

set_jenkins() {
    aws configure set aws_access_key_id "$ACCESS_KEY_ID_JENKINS"
    aws configure set aws_secret_access_key "$SECRET_ACCESS_KEY_JENKINS"
    aws configure set region "ap-northeast-1"

    echo ran set jenkins
}

whoami () {
    aws sts get-caller-identity
}

create_role() {
    local ROLE_NAME="$1"
    local POLICY_NAME="$2"
    local RESOURCE_SET="$3"

    aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file://$POLICY_NAME.json

    if [[ "$RESOURCE_SET" == "set_1" ]]; then

        aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess

        aws iam attach-role-policy \
        --role-name $ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess
    
        echo set ec2, rds access to role: $ROLE_NAME
    fi

}

set_assume_role_policy() {
    local USER="$1"
    local POLICY_NAME_LABEL="$2"
    local POLICY_NAME="$3"
    aws iam put-user-policy \
        --user-name $USER \
        --policy-name $POLICY_NAME_LABEL \
        --policy-document file://$POLICY_NAME.json

    echo set ec2, rds access to role: $ROLE_NAME
}