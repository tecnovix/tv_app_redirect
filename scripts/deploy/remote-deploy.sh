#!/bin/bash
# ===========================================
# TV_APP_REDIRECT - Remote Deployment Script
# ===========================================
# Este script executa deploy remoto do seu Mac para o servidor de produção.
# Faz: git push local → git pull no servidor → prisma migrate → build → restart
#
# CONFIGURAÇÃO SSH:
# -----------------
#   SSH_HOST     - IP ou hostname do servidor
#   SSH_PORT     - Porta SSH (padrão: 22)
#   SSH_USER     - Usuário SSH
#   SSH_KEY      - Caminho da chave privada (opcional)
# ===========================================

set -e

# ===========================================
# CONFIGURAÇÃO - AJUSTE CONFORME NECESSÁRIO
# ===========================================
SSH_HOST="${SSH_HOST:-187.45.191.50}"
SSH_PORT="${SSH_PORT:-1157}"
SSH_USER="${SSH_USER:-root}"
SSH_KEY="${SSH_KEY:-}"

# Caminho do projeto no servidor
REMOTE_PATH="/opt/tecnovix/apps/tv_app_redirect"

# URL para verificar deploy
SITE_URL="https://redirect.tecnovix.app"
HEALTH_URL="https://redirect.tecnovix.app/api/health"

# ===========================================
# CORES E HELPERS
# ===========================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }

# Monta comando SSH
ssh_cmd() {
    local ssh_opts="-p $SSH_PORT"
    if [ -n "$SSH_KEY" ]; then
        ssh_opts="$ssh_opts -i $SSH_KEY"
    fi
    ssh $ssh_opts "$SSH_USER@$SSH_HOST" "$@"
}

# ===========================================
# FUNÇÕES PRINCIPAIS
# ===========================================

show_help() {
    echo "Usage: ./scripts/deploy/remote-deploy.sh [comando]"
    echo ""
    echo "Comandos:"
    echo "  deploy    Deploy completo: push → pull → migrate → build → restart (padrão)"
    echo "  quick     Deploy rápido: push → pull → restart (sem rebuild)"
    echo "  build     Apenas rebuild no servidor (sem git)"
    echo "  migrate   Apenas rodar migrações do Prisma"
    echo "  restart   Apenas restart dos containers"
    echo "  status    Verificar status dos containers"
    echo "  logs      Ver logs da aplicação"
    echo "  health    Verificar health check"
    echo "  help      Mostrar esta ajuda"
    echo ""
    echo "Exemplos:"
    echo "  ./scripts/deploy/remote-deploy.sh           # Deploy completo"
    echo "  ./scripts/deploy/remote-deploy.sh quick     # Deploy sem rebuild"
    echo "  ./scripts/deploy/remote-deploy.sh health    # Ver health + geo stats"
    echo ""
    echo "Configuração SSH (variáveis de ambiente):"
    echo "  SSH_HOST=$SSH_HOST"
    echo "  SSH_PORT=$SSH_PORT"
    echo "  SSH_USER=$SSH_USER"
    echo "  SSH_KEY=${SSH_KEY:-<padrão do sistema>}"
    echo ""
}

check_local_git() {
    log_step "Verificando Git Local"

    # Verificar se há alterações não commitadas
    if ! git diff --quiet || ! git diff --cached --quiet; then
        log_warn "Há alterações não commitadas!"
        git status --short
        echo ""
        read -p "Deseja fazer commit automático? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            while true; do
                read -p "Mensagem do commit: " commit_msg
                if [ -n "$commit_msg" ]; then
                    break
                fi
                log_warn "Mensagem não pode ser vazia. Tente novamente."
            done
            git add -A
            git commit -m "$commit_msg"
            log_success "Commit criado"
        else
            log_error "Faça commit das alterações antes de fazer deploy"
            exit 1
        fi
    else
        log_success "Working directory limpo"
    fi
}

git_push() {
    log_step "Git Push (Local → GitHub)"

    local ahead=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
    if [ "$ahead" -gt 0 ]; then
        log_info "Enviando $ahead commit(s)..."
        git push
        log_success "Push concluído"
    else
        log_info "Nenhum commit pendente para push"
    fi
}

git_pull_remote() {
    log_step "Git Pull (Servidor)"

    log_info "Conectando ao servidor..."
    ssh_cmd "cd $REMOTE_PATH && git pull"
    log_success "Pull concluído no servidor"
}

prisma_migrate() {
    log_step "Prisma Migrate (Servidor)"

    log_info "Aplicando migrações do banco de dados..."
    ssh_cmd "cd $REMOTE_PATH && docker compose exec -T app npx prisma db push --accept-data-loss"
    log_success "Migrações aplicadas"
}

build_remote() {
    log_step "Build (Servidor)"

    log_info "Construindo imagem de produção..."
    ssh_cmd "cd $REMOTE_PATH && docker compose build --no-cache app"
    log_success "Build concluído"
}

restart_remote() {
    log_step "Restart Containers (Servidor)"

    log_info "Reiniciando containers..."
    ssh_cmd "cd $REMOTE_PATH && docker compose up -d app"
    log_success "Containers reiniciados"
}

verify_deploy() {
    log_step "Verificação"

    log_info "Aguardando container iniciar..."
    sleep 10

    # Status dos containers
    log_info "Status dos containers:"
    ssh_cmd "docker ps --format 'table {{.Names}}\t{{.Status}}' | grep tv-redirect"

    # Teste HTTP
    log_info "Testando $HEALTH_URL..."
    local response=$(curl -s "$HEALTH_URL" --max-time 10 || echo '{"status":"error"}')
    local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

    if [ "$status" == "ok" ]; then
        log_success "Health check OK"

        # Mostra estatísticas de geolocalização
        echo ""
        log_info "Estatísticas de Geolocalização:"
        echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    else
        log_error "Health check falhou: $response"
        log_warn "Verifique os logs: ./scripts/deploy/remote-deploy.sh logs"
        exit 1
    fi
}

show_status() {
    log_step "Status dos Containers"
    ssh_cmd "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep tv-redirect"
}

show_logs() {
    log_step "Logs da Aplicação"
    ssh_cmd "docker logs tv-redirect-app --tail 100"
}

show_health() {
    log_step "Health Check"

    log_info "Consultando $HEALTH_URL..."
    local response=$(curl -s "$HEALTH_URL" --max-time 10)

    echo ""
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
    echo ""

    # Resumo de geo stats
    local cf_hits=$(echo "$response" | grep -o '"totalCloudflareHits":[0-9]*' | cut -d':' -f2)
    local cache_hits=$(echo "$response" | grep -o '"totalCacheHits":[0-9]*' | cut -d':' -f2)
    local api_calls=$(echo "$response" | grep -o '"totalApiCalls":[0-9]*' | cut -d':' -f2)

    if [ -n "$cf_hits" ]; then
        log_info "Geolocalização:"
        echo "  Cloudflare: $cf_hits hits (ilimitado)"
        echo "  Cache Redis: $cache_hits hits"
        echo "  ip-api.com: $api_calls chamadas"
    fi
}

# ===========================================
# COMANDOS
# ===========================================

cmd_deploy() {
    log_info "Deploy completo iniciado"
    echo ""

    check_local_git
    git_push
    git_pull_remote
    build_remote
    restart_remote

    log_info "Aguardando container inicializar e rodar migrations..."
    sleep 15
    prisma_migrate

    verify_deploy

    echo ""
    log_success "═══════════════════════════════════════"
    log_success "  DEPLOY CONCLUÍDO COM SUCESSO!"
    log_success "═══════════════════════════════════════"
    echo ""
}

cmd_quick() {
    log_info "Deploy rápido (sem rebuild)"
    echo ""

    check_local_git
    git_push
    git_pull_remote
    restart_remote
    verify_deploy

    echo ""
    log_success "Deploy rápido concluído!"
}

cmd_build() {
    log_info "Rebuild no servidor"
    build_remote
    restart_remote
    verify_deploy
}

cmd_migrate() {
    log_info "Executando migrações Prisma"
    prisma_migrate
}

cmd_restart() {
    log_info "Restart containers"
    restart_remote
    verify_deploy
}

# ===========================================
# MAIN
# ===========================================

# Ir para raiz do projeto
cd "$(dirname "$0")/../.."

case "${1:-deploy}" in
    deploy)
        cmd_deploy
        ;;
    quick)
        cmd_quick
        ;;
    build)
        cmd_build
        ;;
    migrate)
        cmd_migrate
        ;;
    restart)
        cmd_restart
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    health)
        show_health
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Comando desconhecido: $1"
        show_help
        exit 1
        ;;
esac
