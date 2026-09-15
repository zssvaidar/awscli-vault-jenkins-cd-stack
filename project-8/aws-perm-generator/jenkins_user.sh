SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/common/init.sh"
source config/.env

set_root
whoami

aws iam create-user --user-name jenkins

aws iam create-access-key --user-name jenkins