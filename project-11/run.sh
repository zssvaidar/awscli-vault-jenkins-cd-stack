
source "wrapper/common/init.sh"
source "wrapper/config/.env"

source "wrapper/config/.other"
# AWS_REGION="${AWS_REGION:-ap-northeast-1}"
# VAULT_KV_PATH="${VAULT_KV_PATH:-secret/jenkins}"
# STATE_FILE="${STATE_FILE:-testing}"

unset_aws
set_root
whoami 

Purpose="${PURPOSE:-testing}"
STATE_FILE=state/$Purpose.env
[[ -f "$STATE_FILE" ]] || { echo "no state file $STATE_FILE"; exit 1; }
AWS_REGION="${AWS_REGION:-ap-northeast-1}"

case "$1" in
    keys)
        NAME="${2:?usage: run.sh keys <name> create|delete}"
        source ./manage_keys.sh
        ;;
    ssm)
        source ./manage_ssm.sh
        ;;
    network)
        source ./manage_network.sh
        ;;
    instances)
        NAME="${2:?usage: run.sh instances <name> <count> create/delete}"
        COUNT="${3:?usage: run.sh instances <name> <count> create/delete}"
        source ./manage_instances.sh
        ;;
    s3)
        NAME="${2:?usage: run.sh s3 <name> create/delete}"
        source ./manage_s3.sh
        ;;
    ami)
        NAME="${2:?usage: run.sh ami <name> <env-type> create/delete}"
        ENV_TYPE="${3:?usage: run.sh ami <name> <env-type> create/delete}"
        source ./manage_ami.sh
        ;;
    instance-ami)
        NAME="${2:?usage: run.sh instance-ami <name> <env-type> <count> create/delete}"
        ENV_TYPE="${3:?usage: run.sh instance-ami <name> <env-type> <count> create/delete}"
        COUNT="${4:?usage: run.sh instance-ami <name> <env-type> <count> create/delete}"
        source ./manage_instance_ami.sh
        ;;
    egress)
        NAME="${2:?usage: run.sh egress <name> create/delete}"
        source ./manage_egress_instance.sh
        ;;
    *)
    
        echo
        echo "Usage: run.sh keys <name> {create|delete}"
        echo "Usage: run.sh ssm {create|delete}"
        echo "Usage: run.sh network {create|delete}"
        echo "Usage: run.sh instances <name> <count> {create|delete}"
        echo "Usage: run.sh s3 <name> {create|delete}"
        echo "Usage: run.sh ami <name> <env-type> {create|delete}"
        echo "Usage: run.sh instance-ami <name> <env-type> <count> {create|delete}"
        echo "Usage: run.sh egress <name> {create|delete}"
        exit 1
        ;;
esac