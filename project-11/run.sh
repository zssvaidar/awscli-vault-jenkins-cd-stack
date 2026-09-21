
source "wrapper/common/init.sh"
source "wrapper/config/.env"

source "wrapper/config/.other"
# AWS_REGION="${AWS_REGION:-ap-northeast-1}"
# VAULT_KV_PATH="${VAULT_KV_PATH:-secret/jenkins}"

unset_aws
set_root
whoami

Purpose="${PURPOSE:-testing}"
[[ -f "state/$STATE_FILE.env" ]] || { echo "no state file $STATE_FILE"; exit 1; }
AWS_REGION="${AWS_REGION:-ap-northeast-1}"

case "$1" in
    keys)
        :"${2:?usage: run.sh keys <name> start|delete}"
        :"${3:?usage: run.sh keys <name> start|delete}"
        source ./manage_keys.sh
        ;;
    ssm)
        :"${2:?usage: run.sh ssm start|delete}"
        source ./manage_ssm.sh
        ;;
    network)
        :"${2:?usage: run.sh network start|delete}"
        source ./manage_network.sh
        ;;
    *)
        echo "Usage run.sh keys <name> {create|delete}"
        echo "Usage run.sh ssm {create|delete}"
        echo "Usage run.sh network {create|delete}"
        exit 1
        ;;
esac