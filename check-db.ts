import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Querying database matches...');
  
  // Count matches
  const totalMatches = await prisma.match.count();
  console.log(`Total matches in DB: ${totalMatches}`);

  // Fetch unique rounds
  const rounds = await prisma.$queryRaw`SELECT round, COUNT(*) FROM "Match" GROUP BY round`;
  console.log('Matches by round:', rounds);

  // Fetch R32 matches
  console.log('\n--- Sample of Matches with round = "round-of-32" ---');
  const r32Matches = await prisma.match.findMany({
    where: { round: 'round-of-32' },
    orderBy: { apiFootballId: 'asc' },
    take: 40,
  });
  console.log(`Found ${r32Matches.length} matches with round = "round-of-32"`);
  r32Matches.forEach(m => {
    console.log(`ID: ${m.id}, apiFootballId: ${m.apiFootballId}, Home: ${m.homeTeamLabel}, Away: ${m.awayTeamLabel}, Kickoff: ${m.kickoffTimeUTC.toISOString()}, Status: ${m.status}`);
  });

  // Fetch matches with apiFootballId between 73 and 88
  console.log('\n--- Matches with apiFootballId between 73 and 88 ---');
  const customR32 = await prisma.match.findMany({
    where: {
      apiFootballId: {
        gte: 73,
        lte: 88,
      }
    },
    orderBy: { apiFootballId: 'asc' },
  });
  console.log(`Found ${customR32.length} matches with apiFootballId between 73 and 88`);
  customR32.forEach(m => {
    console.log(`ID: ${m.id}, apiFootballId: ${m.apiFootballId}, Kickoff: ${m.kickoffTimeUTC.toISOString()}`);
  });

  // Let's also check a sample of all knockout matches
  console.log('\n--- Sample of all knockout matches ---');
  const allKnockouts = await prisma.match.findMany({
    where: {
      NOT: { round: 'group-stage' }
    },
    orderBy: { apiFootballId: 'asc' },
  });
  console.log(`Found ${allKnockouts.length} total knockout matches`);
  allKnockouts.forEach(m => {
    console.log(`ID: ${m.id}, apiFootballId: ${m.apiFootballId}, Round: ${m.round}, Kickoff: ${m.kickoffTimeUTC.toISOString()}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
