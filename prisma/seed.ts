import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { hashSync } from 'bcrypt';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

const institutionName = 'НКПиИТ';

async function main() {
  console.log('seeding...');

  let institution = await prisma.institution.findFirst({
    where: { name: institutionName },
  });

  if (!institution) {
    institution = await prisma.institution.create({
      data: {
        name: institutionName,
      },
    });
    console.log('institution created', institution.name);
  } else {
    console.log('institution found', institution.name);
  }

  const existingAdmin = await prisma.user.findFirst({
    where: { email: 'admin@example.com' },
  });

  if (existingAdmin) {
    console.log('admin already exists');
    return;
  }

  const admin = await prisma.user.create({
    data: {
      institutionId: institution.id,
      name: 'admin',
      surname: 'admin',
      patronymic: 'admin',
      email: 'admin@example.com',
      password: hashSync('admin', 10),
      roles: [Role.ADMIN],
      isActivated: true,
    },
  });

  console.log('admin created', admin.email);
}

main()
  .catch((e) => {
    console.error('error in seeding', e);
    process.exit(1);
  })
  .finally(async () => await prisma.$disconnect());
