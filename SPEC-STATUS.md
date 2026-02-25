# Status do projeto vs spec (sistema de vendas por comissão – limpa nome)

Lista do **que foi feito** e do **que ainda falta** em relação ao documento de especificação.

---

## ✅ O QUE FOI FEITO

### Visão geral / Objetivo
- [x] Gerenciar vendedores com comissão
- [x] Cadastro de clientes
- [x] Acompanhamento do processo (status + linha do tempo)
- [x] Pagamento individual por cliente (intenção + confirmação pelo admin)
- [x] Controle total pelo administrador

### Acessos
- [x] Acesso do vendedor (login, painel)
- [x] Acesso do administrador (login, painel)
- [x] Link individual do cliente (página pública `/acompanhar/[link]`)
- [x] Integração de pagamento individual (fluxo: criar intenção → admin confirma)
- [x] Controle de comissões (cálculo automático + admin vê % no dashboard)

### Perfil VENDEDOR
- [x] Login próprio
- [x] Cadastrar clientes (Nome, CPF/CNPJ, WhatsApp, Email, Valor)
- [x] Cadastrar pré-postos (subvendedores) – página Prepostos
- [x] Acompanhar seus clientes (lista + detalhe + alterar status + linha do tempo)
- [x] Ver suas comissões (dashboard: total vendido, comissões a receber)
- [x] Não vê clientes de outros vendedores (API filtra por vendedor/preposto)

### Perfil PREPOSTO
- [x] Login próprio
- [x] Cadastrar clientes (vinculados ao vendedor pai)
- [x] Ver clientes do time (vendedor pai + dele)
- [x] Ver suas comissões (vendas em que ele é preposto)
- [x] Não cadastra prepostos (apenas vendedor)

### Perfil ADMIN
- [x] Ver todos os vendedores (e prepostos) – página Vendedores
- [x] Ver todos os clientes
- [x] Editar qualquer cadastro (cliente, usuário)
- [x] Aprovar vendas (confirmar pagamento em Pagamentos)
- [x] Controlar comissões (ver % no dashboard; % definidos por env)
- [x] Ver pagamentos – lista e botão Confirmar
- [x] Dashboard geral (total vendas, ranking, pagamentos recebidos, processos em andamento, taxa de conversão, comissões atuais)

### Banco de dados
- [x] Tabela **usuarios** (id, nome, email, senha, tipo, vendedor_pai_id, status, data_criacao)
- [x] Tabela **clientes** (id, nome, cpf_cnpj, telefone, email, vendedor_id, status_processo, data_cadastro, link_acompanhamento, valor_servico; + preposto_id para comissão)
- [x] Tabela **vendas** (id, cliente_id, vendedor_id, valor_servico, comissao_vendedor, comissao_preposto, status_pagamento, data_venda; + preposto_id)
- [x] Tabela **pagamentos** (id, cliente_id, valor, forma_pagamento, status, gateway_id, data_pagamento)
- [x] Tabela **historico_processo** (id, cliente_id, status, descricao, data_atualizacao)

### Fluxo do sistema
- [x] 1) Vendedor faz login → entra no painel
- [x] 2) Vendedor cadastra cliente (campos do spec) → sistema gera vendedor_id e link individual
- [x] 3) Link individual (ex.: `/acompanhar/ABC123`) → cliente vê status, etapas, pagamento, histórico
- [x] 4) Cliente faz pagamento individual → fluxo: abrir link, “Pagar com PIX” (intenção), admin confirma → status “Pago”, processo liberado, comissão calculada
- [x] 5) Cálculo automático de comissão (ex.: 20% vendedor, 5% preposto – via env)

### Dashboards
- [x] **Dashboard vendedor:** Total vendido, Comissões a receber, Clientes em andamento, Clientes pagos, Clientes pendentes + gráfico
- [x] **Dashboard admin:** Total de vendas, Ranking de vendedores, Pagamentos recebidos, Processos em andamento, Taxa de conversão, Comissões atuais (%)

### Ecossistema de acompanhamento
- [x] Status: Cadastro recebido, Em análise, Em andamento, Aguardando pagamento, Concluído, Cancelado
- [x] Linha do tempo em todas as telas relevantes (detalhe do cliente, portal do cliente)

### MVP (versão inicial)
- [x] Login
- [x] Cadastro de vendedores (admin)
- [x] Cadastro de clientes
- [x] Link individual
- [x] Pagamento PIX (botão + intenção; confirmação manual pelo admin)
- [x] Cálculo de comissão
- [x] Dashboard básico (vendedor e admin)

### Extras já no projeto
- [x] Copiar link do cliente (após cadastro, na lista, no detalhe)
- [x] Modal com link após cadastrar cliente
- [x] Toasts em ações
- [x] Tabelas com busca, paginação, ordenação
- [x] Gráficos (Recharts) nos dashboards

---

## ❌ O QUE AINDA FALTA (ou é diferente do spec)

### 1. Confirmação **automática** de pagamento
- **Spec:** “Cliente abre link → paga → sistema confirma automaticamente”.
- **Hoje:** Cliente gera intenção de pagamento; o **admin** confirma manualmente em “Pagamentos”.
- **Falta:** Integração com gateway (Asaas, Mercado Pago etc.) + webhook para confirmação automática quando o pagamento for aprovado.

### 2. Integração real com gateway de pagamento
- **Spec:** Mercado Pago, PagSeguro, Stripe, Asaas, PIX automático.
- **Hoje:** Apenas fluxo de “intenção” e confirmação manual; não há geração de PIX/QR code nem cobrança real por gateway.
- **Falta:** Integrar um gateway (ex.: Asaas ou Mercado Pago) para gerar PIX/cartão e receber webhook de confirmação.

### ~~3. Admin alterar % de comissão pela interface~~ ✅ Feito
- **Spec:** Admin “Controlar comissões”.
- **Implementado:** Tabela `config` no banco (chave/valor); tela **Comissões** no menu admin para editar e salvar % de vendedor e preposto. Valores persistem no banco; se não houver registro, usa fallback do `.env`.

### 4. Banco de dados
- **Spec:** PostgreSQL.
- **Hoje:** MySQL (Prisma); funciona normalmente.
- **Observação:** Trocar para PostgreSQL seria ajuste de driver e connection string; a lógica do sistema já está pronta.

### 5. (Opcional) Relatórios / exportação
- Spec não detalha; pode evoluir com relatórios de vendas/comissões e exportação (Excel/PDF).

---

## Resumo

| Item                         | Status        |
|-----------------------------|---------------|
| Perfis (vendedor, admin, preposto) | ✅ Feito      |
| Cadastro clientes/vendedores/prepostos | ✅ Feito |
| Link individual + portal do cliente | ✅ Feito |
| Status + linha do tempo     | ✅ Feito      |
| Pagamento (fluxo MVP)      | ✅ Feito (confirmação manual) |
| Comissão automática + admin vê % | ✅ Feito  |
| Dashboards                  | ✅ Feito      |
| Confirmação automática (webhook) | ❌ Falta  |
| Gateway real (PIX/cartão)  | ❌ Falta      |
| Admin editar % comissão na tela | ✅ Feito (página Comissões) |
| Banco PostgreSQL            | ⚠️ Projeto usa MySQL |

Próximos passos sugeridos: integração com gateway (ex.: Asaas) + webhook para confirmação automática de pagamento.
