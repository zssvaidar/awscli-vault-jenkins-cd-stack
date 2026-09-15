#!/usr/bin/env bash
set -e

# -------------------------
# Groups
# -------------------------

aws iam create-group --group-name RDSAdmins
aws iam create-group --group-name EC2Admins
aws iam create-group --group-name InfrastructureAdmins
# aws iam create-group --group-name ReadOnly


# -------------------------
# RDS
# -------------------------

aws iam attach-group-policy \
  --group-name RDSAdmins \
  --policy-arn arn:aws:iam::aws:policy/AmazonRDSFullAccess


# -------------------------
# EC2
# -------------------------

aws iam attach-group-policy \
  --group-name EC2Admins \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess


# -------------------------
# Infrastructure
# -------------------------

aws iam attach-group-policy \
  --group-name InfrastructureAdmins \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess


# -------------------------
# Read-only
# -------------------------

# aws iam attach-group-policy \
#   --group-name ReadOnly \
#   --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess