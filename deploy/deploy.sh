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

# 4. MySQL client (instala se não existir) e criar banco
echo ""
if ! command -v mysql &> /dev/null; then
  echo "[*] Cliente MySQL não encontrado. Instalando..."
  if command -v apt-get &> /dev/null; then
    export DEBIAN_FRONTEND=noninteractive
    if sudo -n true 2>/dev/null; then
      sudo apt-get update -qq && sudo apt-get install -y -qq default-mysql-client || sudo apt-get install -y -qq mysql-client
    else
      apt-get update -qq && apt-get install -y -qq default-mysql-client 2>/dev/null || apt-get install -y -qq mysql-client 2>/dev/null || \
      echo "[AVISO] Rode com sudo para instalar: sudo apt-get install default-mysql-client"
    fi
  elif command -v apk &> /dev/null; then
    (sudo -n true 2>/dev/null && sudo apk add --no-cache mysql-client) || \
    (apk add --no-cache mysql-client 2>/dev/null) || \
    echo "[AVISO] Rode com sudo ou instale: apk add mysql-client"
  else
    echo "[AVISO] Instale o cliente MySQL (apt-get install default-mysql-client ou apk add mysql-client)."
  fi
fi
if command -v mysql &> /dev/null; then
  echo "[OK] MySQL client disponível."
fi

echo ""
echo "[*] Conectando e criando banco de dados (se não existir)..."
DATABASE_URL=$(grep '^DATABASE_URL=' "$ROOT/packages/database/.env" | cut -d= -f2- | tr -d '"')
MYSQL_ROOT_PASSWORD=$(grep '^MYSQL_ROOT_PASSWORD=' "$ROOT/packages/database/.env" | cut -d= -f2-)
MYSQL_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):\([0-9]*\)/.*|\1|p')
MYSQL_PORT=$(echo "$DATABASE_URL" | sed -n 's|.*@[^:]*:\([0-9]*\)/.*|\1|p')
MYSQL_DB=$(echo "$DATABASE_URL" | sed -n 's|.*/\([^?]*\).*|\1|p')
MYSQL_USER=$(echo "$DATABASE_URL" | sed -n 's|mysql://\([^:]*\):.*|\1|p')
MYSQL_PASS=$(echo "$DATABASE_URL" | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p')

# Descobrir como conectar como root: com senha ou sudo (auth_socket no Ubuntu)
MYSQL_ROOT_CMD=""
if [ -n "$DATABASE_URL" ] && command -v mysql &> /dev/null; then
  if [ -n "$MYSQL_ROOT_PASSWORD" ] && mysql -h "$MYSQL_HOST" -P "${MYSQL_PORT:-3306}" -u root -p"$MYSQL_ROOT_PASSWORD" -e "SELECT 1;" 2>/dev/null; then
    MYSQL_ROOT_CMD="mysql -h $MYSQL_HOST -P ${MYSQL_PORT:-3306} -u root -p$MYSQL_ROOT_PASSWORD"
  elif sudo mysql -e "SELECT 1;" 2>/dev/null; then
    MYSQL_ROOT_CMD="sudo mysql"
  fi
fi

if [ -n "$MYSQL_ROOT_CMD" ] && [ -n "$MYSQL_DB" ]; then
  if $MYSQL_ROOT_CMD -e "CREATE DATABASE IF NOT EXISTS \`$MYSQL_DB\`;" 2>/dev/null; then
    echo "[OK] Banco \`$MYSQL_DB\` garantido."
  fi
else
  echo "[AVISO] Não foi possível conectar como root (tente senha em deploy/env.database ou rode o deploy com sudo)."
fi

echo ""
echo "[*] Configurando usuário MySQL (mysql_native_password para o Prisma)..."
if [ -n "$MYSQL_ROOT_CMD" ] && [ -n "$MYSQL_USER" ] && [ -n "$MYSQL_PASS" ] && [ -n "$MYSQL_DB" ]; then
  SQL_AUTH="CREATE USER IF NOT EXISTS \`$MYSQL_USER\`@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_PASS'; CREATE USER IF NOT EXISTS \`$MYSQL_USER\`@'%' IDENTIFIED WITH mysql_native_password BY '$MYSQL_PASS'; ALTER USER \`$MYSQL_USER\`@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_PASS'; ALTER USER \`$MYSQL_USER\`@'%' IDENTIFIED WITH mysql_native_password BY '$MYSQL_PASS'; GRANT ALL PRIVILEGES ON \`$MYSQL_DB\`.* TO \`$MYSQL_USER\`@'localhost'; GRANT ALL PRIVILEGES ON \`$MYSQL_DB\`.* TO \`$MYSQL_USER\`@'%'; FLUSH PRIVILEGES;"
  if $MYSQL_ROOT_CMD -e "$SQL_AUTH" 2>/dev/null; then
    echo "[OK] Usuário $MYSQL_USER configurado (mysql_native_password)."
  else
    echo "[AVISO] Não foi possível configurar o usuário. Continuando..."
  fi
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
