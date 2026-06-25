import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.match.findMany();
  console.log('Matches:', matches.length);
  
  const finishedMatches = await prisma.match.findMany({
    where: { status: 'FINISHED' }
  });
  console.log('Finished Matches:', finishedMatches.length);
  
  const users = await prisma.user.findMany();
  console.log('Users:', users.length);
  if (users.length > 0) {
    console.log('Sample User Points:', users[0].points);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
