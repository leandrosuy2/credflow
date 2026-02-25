import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SALT = 10;

async function main() {
  console.log('🌱 Seed CredFlow (teste)...\n');

  // ——— Níveis (Bronze, Prata, Ouro) ———
  await prisma.nivel.upsert({
    where: { nome: 'BRONZE' },
    create: { nome: 'BRONZE', valorAdesao: 200, valorBonus: 100, ordem: 1 },
    update: { valorAdesao: 200, valorBonus: 100, ordem: 1 },
  });
  await prisma.nivel.upsert({
    where: { nome: 'PRATA' },
    create: { nome: 'PRATA', valorAdesao: 300, valorBonus: 150, ordem: 2 },
    update: { valorAdesao: 300, valorBonus: 150, ordem: 2 },
  });
  await prisma.nivel.upsert({
    where: { nome: 'OURO' },
    create: { nome: 'OURO', valorAdesao: 500, valorBonus: 250, ordem: 3 },
    update: { valorAdesao: 500, valorBonus: 250, ordem: 3 },
  });
  console.log('✓ Níveis: Bronze (R$200/ R$100), Prata (R$300/ R$150), Ouro (R$500/ R$250)');

  // ——— Config (comissões) ———
  await prisma.config.upsert({
    where: { chave: 'COMISSAO_VENDEDOR' },
    create: { chave: 'COMISSAO_VENDEDOR', valor: '20' },
    update: { valor: '20' },
  });
  await prisma.config.upsert({
    where: { chave: 'COMISSAO_PREPOSTO' },
    create: { chave: 'COMISSAO_PREPOSTO', valor: '5' },
    update: { valor: '5' },
  });
  await prisma.config.upsert({
    where: { chave: 'BONUS_INDICADOR_VALOR' },
    create: { chave: 'BONUS_INDICADOR_VALOR', valor: '100' },
    update: { valor: '100' },
  });
  console.log('✓ Config comissões (20% / 5%) e bônus indicador (R$ 100)');

  // ——— Admin ———
  let admin = await prisma.usuario.findFirst({ where: { tipo: 'admin' } });
  if (!admin) {
    admin = await prisma.usuario.create({
      data: {
        nome: 'Administrador',
        email: 'admin@credflow.com',
        senhaHash: await bcrypt.hash('admin123', SALT),
        tipo: 'admin',
      },
    });
    console.log('✓ Admin criado: admin@credflow.com / admin123');
  } else {
    console.log('✓ Admin já existe: admin@credflow.com');
  }

  // ——— Vendedores ———
  const v1 = await prisma.usuario.upsert({
    where: { email: 'vendedor1@credflow.com' },
    create: {
      nome: 'Carlos Vendedor',
      email: 'vendedor1@credflow.com',
      senhaHash: await bcrypt.hash('123456', SALT),
      tipo: 'vendedor',
    },
    update: {},
  });
  const v2 = await prisma.usuario.upsert({
    where: { email: 'vendedor2@credflow.com' },
    create: {
      nome: 'Ana Vendedora',
      email: 'vendedor2@credflow.com',
      senhaHash: await bcrypt.hash('123456', SALT),
      tipo: 'vendedor',
    },
    update: {},
  });
  console.log('✓ Vendedores: vendedor1@credflow.com, vendedor2@credflow.com (senha: 123456)');

  // ——— Prepostos ———
  const p1 = await prisma.usuario.upsert({
    where: { email: 'preposto1@credflow.com' },
    create: {
      nome: 'João Preposto',
      email: 'preposto1@credflow.com',
      senhaHash: await bcrypt.hash('123456', SALT),
      tipo: 'preposto',
      vendedorPaiId: v1.id,
    },
    update: {},
  });
  await prisma.usuario.upsert({
    where: { email: 'preposto2@credflow.com' },
    create: {
      nome: 'Maria Preposta',
      email: 'preposto2@credflow.com',
      senhaHash: await bcrypt.hash('123456', SALT),
      tipo: 'preposto',
      vendedorPaiId: v2.id,
    },
    update: {},
  });
  console.log('✓ Prepostos: preposto1@credflow.com (de Carlos), preposto2@credflow.com (de Ana) — senha: 123456');

  // ——— Clientes ———
  const clientesData = [
    { nome: 'Cliente Teste 1', vendedorId: v1.id, prepostoId: null, valor: 400, status: 'CADASTRO_RECEBIDO' as const, link: 'LINK01' },
    { nome: 'Cliente Teste 2', vendedorId: v1.id, prepostoId: null, valor: 650, status: 'EM_ANALISE' as const, link: 'LINK02' },
    { nome: 'Cliente Teste 3', vendedorId: v1.id, prepostoId: p1.id, valor: 500, status: 'AGUARDANDO_PAGAMENTO' as const, link: 'LINK03' },
    { nome: 'Cliente Teste 4', vendedorId: v2.id, prepostoId: null, valor: 800, status: 'EM_ANDAMENTO' as const, link: 'LINK04' },
    { nome: 'Cliente Teste 5', vendedorId: v2.id, prepostoId: null, valor: 350, status: 'PAGO' as const, link: 'LINK05' },
  ];

  for (const c of clientesData) {
    const prepostoId = c.prepostoId;
    await prisma.cliente.upsert({
      where: { linkAcompanhamento: c.link },
      create: {
        nome: c.nome,
        cpfCnpj: '12345678900',
        telefone: '11999998888',
        email: `${c.link.toLowerCase()}@teste.com`,
        valorServico: c.valor,
        vendedorId: c.vendedorId,
        prepostoId,
        statusProcesso: c.status,
        linkAcompanhamento: c.link,
      },
      update: { statusProcesso: c.status },
    });
  }
  const clientes = await prisma.cliente.findMany({ where: { linkAcompanhamento: { in: clientesData.map((c) => c.link) } } });
  for (const cliente of clientes) {
    const count = await prisma.historicoProcesso.count({ where: { clienteId: cliente.id } });
    if (count === 0) {
      await prisma.historicoProcesso.create({
        data: {
          clienteId: cliente.id,
          status: cliente.statusProcesso,
          descricao: cliente.statusProcesso === 'CADASTRO_RECEBIDO' ? 'Cadastro recebido no sistema' : `Status: ${cliente.statusProcesso}`,
        },
      });
    }
  }
  console.log('✓ Clientes de teste (LINK01 a LINK05) com histórico');

  // ——— Pagamento + Venda para cliente PAGO (LINK05) ———
  const clientePago = await prisma.cliente.findFirst({ where: { linkAcompanhamento: 'LINK05' } });
  if (clientePago) {
    const pagamentoExistente = await prisma.pagamento.findFirst({ where: { clienteId: clientePago.id, status: 'PAGO' } });
    if (!pagamentoExistente) {
      await prisma.pagamento.create({
        data: {
          clienteId: clientePago.id,
          valor: clientePago.valorServico,
          formaPagamento: 'PIX',
          status: 'PAGO',
          dataPagamento: new Date(),
        },
      });
    }
    const vendaExistente = await prisma.venda.findFirst({ where: { clienteId: clientePago.id } });
    if (!vendaExistente) {
      const valor = Number(clientePago.valorServico);
      await prisma.venda.create({
        data: {
          clienteId: clientePago.id,
          vendedorId: clientePago.vendedorId,
          prepostoId: clientePago.prepostoId,
          valorServico: valor,
          comissaoVendedor: valor * 0.2,
          comissaoPreposto: clientePago.prepostoId ? valor * 0.05 : null,
          statusPagamento: 'PAGO',
        },
      });
    }
    console.log('✓ Venda e pagamento de exemplo (Cliente 5 - LINK05)');
  }

  // ——— Pagamento pendente (LINK03) ———
  const clientePendente = await prisma.cliente.findFirst({ where: { linkAcompanhamento: 'LINK03' } });
  if (clientePendente) {
    const countPag = await prisma.pagamento.count({ where: { clienteId: clientePendente.id } });
    if (countPag === 0) {
      await prisma.pagamento.create({
        data: {
          clienteId: clientePendente.id,
          valor: clientePendente.valorServico,
          formaPagamento: 'PIX',
          status: 'PENDENTE',
        },
      });
      console.log('✓ Pagamento pendente de exemplo (Cliente 3 - LINK03)');
    }
  }

  console.log('\n✅ Seed concluído. Contas para teste:');
  console.log('   Admin:    admin@credflow.com / admin123');
  console.log('   Vendedor: vendedor1@credflow.com ou vendedor2@credflow.com / 123456');
  console.log('   Preposto: preposto1@credflow.com ou preposto2@credflow.com / 123456');
  console.log('   Link cliente: /acompanhar/LINK01 até LINK05');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
