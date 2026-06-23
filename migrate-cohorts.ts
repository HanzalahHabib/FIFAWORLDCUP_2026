import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    // 1. Update Vince to 'East Side'
    const updateVince = await prisma.user.updateMany({
      where: {
        OR: [
          { name: { equals: 'vince', mode: 'insensitive' } },
          { email: 'vince@businessrocket.com' },
          { email: 'vince@fifa.com' }
        ]
      },
      data: {
        cohort: 'East Side'
      }
    });
    console.log(`Updated ${updateVince.count} user(s) named Vince to 'East Side'`);

    // 2. Update remaining 'PK Team' users to 'East Side'
    const updatePK = await prisma.user.updateMany({
      where: {
        cohort: 'PK Team'
      },
      data: {
        cohort: 'East Side'
      }
    });
    console.log(`Updated ${updatePK.count} remaining 'PK Team' user(s) to 'East Side'`);

    // 3. Update remaining 'US Team' users to 'West Side'
    const updateUS = await prisma.user.updateMany({
      where: {
        cohort: 'US Team'
      },
      data: {
        cohort: 'West Side'
      }
    });
    console.log(`Updated ${updateUS.count} remaining 'US Team' user(s) to 'West Side'`);

    // 4. Verify all users
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        cohort: true
      }
    });
    console.log("Current user list after migration:", JSON.stringify(allUsers, null, 2));

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
