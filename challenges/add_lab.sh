#!/usr/bin/env bash
# ============================================================================
# XploitVerse — Add Lab Automation Script (Linux/macOS)
# ============================================================================
# Usage:  ./add_lab.sh [lab-directory-name]
# If no argument is provided, the script will prompt interactively.
#
# This script:
#   1. Validates the lab directory and Dockerfile exist
#   2. Builds the Docker image
#   3. Inserts asset, room, module, and task rows into PostgreSQL
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CHALLENGES_DIR="$ROOT_DIR/challenges"
POSTGRES_CONTAINER="xv-postgres"
DB_NAME="xploitverse"
DB_USER="postgres"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════╗"
    echo "║   🔧 XploitVerse — Add Lab Automation           ║"
    echo "╚══════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

error() { echo -e "${RED}[ERROR]${NC} $1" >&2; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

# ── Gather lab name ─────────────────────────────────────────────────────────
banner

if [ $# -ge 1 ]; then
    LAB_NAME="$1"
else
    echo "Available lab directories:"
    echo "─────────────────────────"
    for d in "$CHALLENGES_DIR"/*/; do
        dirname="$(basename "$d")"
        if [ -f "$d/Dockerfile" ]; then
            echo -e "  ${GREEN}✔${NC} $dirname"
        else
            echo -e "  ${RED}✘${NC} $dirname (no Dockerfile)"
        fi
    done
    echo ""
    read -rp "Enter the lab directory name: " LAB_NAME
fi

LAB_DIR="$CHALLENGES_DIR/$LAB_NAME"

# ── Validate ────────────────────────────────────────────────────────────────
if [ ! -d "$LAB_DIR" ]; then
    error "Directory not found: $LAB_DIR"
    exit 1
fi
if [ ! -f "$LAB_DIR/Dockerfile" ]; then
    error "No Dockerfile found in $LAB_DIR"
    exit 1
fi
success "Lab directory validated: $LAB_DIR"

# ── Gather metadata ────────────────────────────────────────────────────────
read -rp "Lab display name (e.g. 'SQL Injection Lab'): " LAB_DISPLAY_NAME
read -rp "Description: " LAB_DESCRIPTION
read -rp "Difficulty (Easy/Medium/Hard) [Easy]: " LAB_DIFFICULTY
LAB_DIFFICULTY="${LAB_DIFFICULTY:-Easy}"
read -rp "Category (e.g. 'Web Exploitation') [Red Team]: " LAB_CATEGORY
LAB_CATEGORY="${LAB_CATEGORY:-Red Team}"
read -rp "Exposed ports (comma-separated, e.g. '22/tcp,5000/tcp') [22/tcp,5000/tcp]: " LAB_PORTS
LAB_PORTS="${LAB_PORTS:-22/tcp,5000/tcp}"
read -rp "Flag value (e.g. 'FLAG{my_flag}') [FLAG{xv_${LAB_NAME}}]: " LAB_FLAG
LAB_FLAG="${LAB_FLAG:-FLAG{xv_${LAB_NAME}}}"

DOCKER_IMAGE="xploitverse/${LAB_NAME}:latest"

# ── Build Docker image ──────────────────────────────────────────────────────
info "Building Docker image: $DOCKER_IMAGE ..."
if docker build -t "$DOCKER_IMAGE" "$LAB_DIR"; then
    success "Docker image built: $DOCKER_IMAGE"
else
    error "Docker build failed!"
    exit 1
fi

# ── Format ports for JSONB ──────────────────────────────────────────────────
PORTS_JSON="["
IFS=',' read -ra PORT_ARRAY <<< "$LAB_PORTS"
for i in "${!PORT_ARRAY[@]}"; do
    port=$(echo "${PORT_ARRAY[$i]}" | xargs)
    if [ "$i" -gt 0 ]; then PORTS_JSON+=","; fi
    PORTS_JSON+="\"$port\""
done
PORTS_JSON+="]"

# ── Compute flag hash ───────────────────────────────────────────────────────
FLAG_HASH=$(echo -n "$LAB_FLAG" | sha256sum | awk '{print $1}')

# ── Insert into PostgreSQL ──────────────────────────────────────────────────
info "Inserting lab into PostgreSQL..."

SLUG=$(echo "$LAB_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g')

SQL=$(cat <<EOSQL
DO \$\$
DECLARE
    v_asset_id BIGINT;
    v_room_id BIGINT;
    v_module_id BIGINT;
BEGIN
    -- Asset
    INSERT INTO assets (name, source_type, source_ref, docker_image, build_context_path, exposed_ports_json, env_json, type, is_active)
    VALUES ('${LAB_DISPLAY_NAME}', 'custom', 'challenges/${LAB_NAME}', '${DOCKER_IMAGE}', NULL, '${PORTS_JSON}'::jsonb, '{}'::jsonb, 'target', true)
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_asset_id;

    IF v_asset_id IS NULL THEN
        SELECT id INTO v_asset_id FROM assets WHERE docker_image = '${DOCKER_IMAGE}' LIMIT 1;
        RAISE NOTICE 'Asset already exists (id=%)', v_asset_id;
    END IF;

    -- Room
    INSERT INTO rooms (slug, title, description, difficulty, is_public)
    VALUES ('${SLUG}', '${LAB_DISPLAY_NAME}', '${LAB_DESCRIPTION}', '${LAB_DIFFICULTY}', true)
    ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
    RETURNING id INTO v_room_id;

    -- Module
    INSERT INTO modules (room_id, title, description, order_no, points_reward, is_published)
    VALUES (v_room_id, 'Module 1', '${LAB_DESCRIPTION}', 1, 100, true)
    RETURNING id INTO v_module_id;

    -- Task
    INSERT INTO tasks (room_id, module_id, asset_id, title, type, flag_type, body_markdown, prompt, hints_json, order_no, points, hint_penalty, flag_hash, is_published)
    VALUES (v_room_id, v_module_id, v_asset_id, 'Find the Flag', 'flag', 'string', 'Exploit the vulnerabilities in this lab to find the hidden flag.', 'Submit the flag.', '["Look for common vulnerabilities","Check all endpoints","Try default credentials"]'::jsonb, 1, 100, 25, '${FLAG_HASH}', true);

    RAISE NOTICE 'Lab added: asset=% room=% module=%', v_asset_id, v_room_id, v_module_id;
END \$\$;
EOSQL
)

if docker exec "$POSTGRES_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "$SQL"; then
    success "Lab inserted into database!"
else
    error "Database insert failed!"
    exit 1
fi

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Lab '$LAB_DISPLAY_NAME' added successfully!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════${NC}"
echo ""
echo "  Docker Image:  $DOCKER_IMAGE"
echo "  Flag:          $LAB_FLAG"
echo "  Flag Hash:     $FLAG_HASH"
echo ""
echo "  Restart the backend to pick up changes:"
echo "    docker compose --profile full restart xv-backend"
echo ""
