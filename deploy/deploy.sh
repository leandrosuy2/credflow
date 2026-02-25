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

cp "$ROOT/deploy/env.database" "$ROOT/packages/database/.env"
cp "$ROOT/deploy/env.api" "$ROOT/apps/api/.env"
cp "$ROOT/deploy/env.web" "$ROOT/apps/web/.env.local"

echo "[OK] .env aplicados (deploy/env.database, env.api, env.web)"

# 3. Dependências (precisamos do Prisma para criar o banco)
echo ""
echo "[*] Instalando dependências..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# 4. Criar banco MySQL com Prisma (conecta no banco que você passou e cria o schema)
echo ""
echo "[*] Conectando e criando banco de dados (se não existir)..."
DATABASE_URL=$(grep '^DATABASE_URL=' "$ROOT/packages/database/.env" | cut -d= -f2- | tr -d '"')
MYSQL_ROOT_PASSWORD=$(grep '^MYSQL_ROOT_PASSWORD=' "$ROOT/packages/database/.env" | cut -d= -f2-)
if [ -n "$DATABASE_URL" ] && [ -n "$MYSQL_ROOT_PASSWORD" ]; then
  MYSQL_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):\([0-9]*\)/.*|\1|p')
  MYSQL_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p')
  MYSQL_DB=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
  ROOT_URL="mysql://root:${MYSQL_ROOT_PASSWORD}@${MYSQL_HOST}:${MYSQL_PORT}/mysql"
  if (cd "$ROOT" && pnpm --filter @credflow/database exec prisma db execute --url "$ROOT_URL" --file "$ROOT/deploy/create-db.sql" 2>/dev/null); then
    echo "[OK] Banco \`$MYSQL_DB\` garantido (conectado em $MYSQL_HOST:$MYSQL_PORT)."
  else
    echo "[AVISO] Não foi possível criar o banco (confira DATABASE_URL e MYSQL_ROOT_PASSWORD em deploy/env.database). Continuando..."
  fi
else
  echo "[AVISO] DATABASE_URL ou MYSQL_ROOT_PASSWORD não definidos. Pulando criação do banco."
fi

# 5. Prisma generate (usa packages/database/.env)
echo ""
echo "[*] Gerando Prisma Client..."
pnpm db:generate

# 6. Build
echo ""
echo "[*] Build da aplicação..."
pnpm build

# 7. Schema no banco (tabelas)
echo ""
echo "[*] Aplicando schema no banco (db push)..."
pnpm db:push

# 8. Seed (cria admin e dados iniciais)
echo ""
echo "[*] Seed do banco (usuário admin e dados iniciais)..."
pnpm db:seed || echo "[AVISO] Seed falhou (pode ser que os dados já existam)."

# 9. PM2
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
pm2 save

echo ""
echo "=============================================="
echo "  Deploy concluído."
echo "=============================================="
echo ""
echo "  URLs públicas (configure o proxy no painel):"
echo "    Frontend: https://credflow.primatasolucoes.com.br  (porta 3020)"
echo "    API:      https://credflow.api.primatasolucoes.com.br  (porta 3010)"
echo ""
echo "  Local (na VPS):"
echo "    API:  http://localhost:3010"
echo "    Web:  http://localhost:3020"
echo ""
echo "  Comandos úteis:"
echo "    pm2 status          - status dos processos"
echo "    pm2 logs            - logs"
echo "    pm2 restart all     - reiniciar"
echo "    pm2 stop all        - parar"
echo "    pm2 startup         - iniciar PM2 no boot (rode e execute o comando que aparecer)"
echo ""
