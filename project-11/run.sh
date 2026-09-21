
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
    *)
        echo
        echo "Usage: run.sh keys <name> {create|delete}"
        echo "Usage: run.sh ssm {create|delete}"
        echo "Usage: run.sh network {create|delete}"
        exit 1
        ;;
esac