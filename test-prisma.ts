import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "file:./dev.db"
    }
  }
});

async function main() {
  await prisma.$connect();
  console.log("Connected successfully");
  await prisma.$disconnect();
}
main();
