import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean existing data
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // Create test user
  const hashedPassword = await bcrypt.hash('Test@1234', 10);
  const user = await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log(`✅ User created: ${user.email}`);

  // Create example products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        name: 'Notebook Pro 15',
        description: 'Notebook de alta performance com processador Intel i9 e 32GB RAM',
        category: 'electronics',
        price: 7999.99,
        stock: 15,
        active: true,
        userId: user.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Teclado Mecânico RGB',
        description: 'Teclado mecânico com switches Cherry MX Red e iluminação RGB',
        category: 'peripherals',
        price: 349.90,
        stock: 50,
        active: true,
        userId: user.id,
      },
    }),
    prisma.product.create({
      data: {
        name: 'Cadeira Gamer Ergonômica',
        description: 'Cadeira com suporte lombar ajustável e apoio de braços 4D',
        category: 'furniture',
        price: 1299.00,
        stock: 8,
        active: true,
        userId: user.id,
      },
    }),
  ]);

  console.log(`✅ ${products.length} products created`);
  console.log('\n🎉 Seed completed!');
  console.log('\n📋 Test credentials:');
  console.log('   Email:    test@example.com');
  console.log('   Password: Test@1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
