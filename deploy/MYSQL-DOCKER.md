# MySQL em Docker – app em outra VPS

Seu MySQL roda em Docker (host `rentflow_credflow` só existe **dentro** da rede do Docker).  
A aplicação roda na VPS `srv966091`, então ela **sempre** deve usar a **URL externa**:

- `mysql://credflow:credflow@31.97.166.208:3306/credflow`

## Erro: "Host '31.97.166.208' is not allowed to connect"

Isso é **permissão no MySQL**: o usuário `credflow` não está autorizado a conectar a partir do IP da sua VPS.

**O que fazer:**

1. No **painel** onde você vê as credenciais (Rentflow/Docker), procure opção de **liberar acesso remoto** ou **allowed hosts** para o usuário `credflow` e adicione o **IP da sua VPS** (ou use “qualquer host” / `%` se o painel permitir).

2. **Se tiver acesso ao container MySQL**, entre no container e rode no MySQL:
   ```sql
   -- Permitir credflow de qualquer host (use só se for seguro)
   CREATE USER IF NOT EXISTS 'credflow'@'%' IDENTIFIED BY 'credflow';
   GRANT ALL PRIVILEGES ON credflow.* TO 'credflow'@'%';
   FLUSH PRIVILEGES;
   ```

3. Se o MySQL estiver em outro servidor e o firewall bloquear a porta 3306, libere a porta **3306** para o IP da sua VPS.

Depois disso, rode de novo na VPS:

```bash
cp deploy/env.database packages/database/.env
cp deploy/env.api apps/api/.env
pnpm db:push
pnpm db:seed
pm2 restart all
```
