import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Applying migration: add round, homeTeamLabel, awayTeamLabel to Match...');
  
  try {
    // Add round column with default value
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "round" TEXT NOT NULL DEFAULT 'group-stage';
    `);
    console.log('✓ Added round column');
  } catch (e: any) {
    console.log('round column may already exist:', e.message);
  }

  try {
    // Add homeTeamLabel column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "homeTeamLabel" TEXT;
    `);
    console.log('✓ Added homeTeamLabel column');
  } catch (e: any) {
    console.log('homeTeamLabel column may already exist:', e.message);
  }

  try {
    // Add awayTeamLabel column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Match" ADD COLUMN IF NOT EXISTS "awayTeamLabel" TEXT;
    `);
    console.log('✓ Added awayTeamLabel column');
  } catch (e: any) {
    console.log('awayTeamLabel column may already exist:', e.message);
  }

  try {
    // Add index on round
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "Match_round_idx" ON "Match"("round");
    `);
    console.log('✓ Added index on round');
  } catch (e: any) {
    console.log('Index may already exist:', e.message);
  }

  console.log('Migration complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
