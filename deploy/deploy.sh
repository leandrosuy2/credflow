#!/usr/bin/env bash
# CredFlow - Script de deploy para VPS
# Uso: após subir o projeto (git clone ou upload), execute: ./deploy/deploy.sh
# Ou: bash deploy/deploy.sh

set -e
cd "$(dirname "$0")/.."
ROOT="$(pwd)"

echo "=============================================="
echo "  CredFlow - Deploy"
echo "=============================================="

# 1. Node e pnpm
if ! command -v node &> /dev/null; then
  echo "[ERRO] Node.js não encontrado. Instale Node 20+: https://nodejs.org"
  exit 1
fi
NODE_VER=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VER" -lt 20 ]; then
  echo "[ERRO] Node 20+ necessário. Atual: $(node -v)"
  exit 1
fi
echo "[OK] Node $(node -v)"

if ! command -v pnpm &> /dev/null; then
  echo "[*] Instalando pnpm..."
  npm install -g pnpm
fi
echo "[OK] pnpm $(pnpm -v)"

# 2. Arquivos .env (templates em deploy/)
echo ""
echo "[*] Configurando .env..."

cp -n "$ROOT/deploy/env.database" "$ROOT/packages/database/.env" 2>/dev/null || true
cp "$ROOT/deploy/env.api" "$ROOT/apps/api/.env"
cp "$ROOT/deploy/env.web" "$ROOT/apps/web/.env.local"

echo "[OK] .env aplicados (edite deploy/env.* e rode de novo para alterar)"

# 3. Dependências
echo ""
echo "[*] Instalando dependências..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# 4. Prisma generate (usa packages/database/.env)
echo ""
echo "[*] Gerando Prisma Client..."
pnpm db:generate

# 5. Build
echo ""
echo "[*] Build da aplicação..."
pnpm build

# 6. Banco de dados (schema)
echo ""
echo "[*] Aplicando schema no banco (db push)..."
pnpm db:push

# 7. Seed (opcional - descomente para criar admin e dados de teste)
# echo ""
# echo "[*] Seed do banco..."
# pnpm db:seed

# 8. PM2
echo ""
if ! command -v pm2 &> /dev/null; then
  echo "[*] Instalando PM2..."
  npm install -g pm2
fi
echo "[OK] PM2 $(pm2 -v 2>/dev/null || true)"

echo ""
echo "[*] Iniciando aplicação com PM2..."
cd "$ROOT"
pm2 start deploy/ecosystem.config.cjs

echo ""
echo "=============================================="
echo "  Deploy concluído."
echo "=============================================="
echo ""
echo "  API:  http://localhost:3010"
echo "  Web:  http://localhost:3020"
echo ""
echo "  Comandos úteis:"
echo "    pm2 status          - status dos processos"
echo "    pm2 logs            - logs"
echo "    pm2 restart all     - reiniciar"
echo "    pm2 stop all        - parar"
echo ""
echo "  Para criar admin e dados de teste, rode:"
echo "    pnpm db:seed"
echo ""
