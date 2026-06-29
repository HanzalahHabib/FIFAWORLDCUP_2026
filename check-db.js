const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Querying database matches...');
  const totalMatches = await prisma.match.count();
  console.log(`Total matches in DB: ${totalMatches}`);

  const rounds = await prisma.$queryRaw`SELECT round, COUNT(*) FROM "Match" GROUP BY round`;
  console.log('Matches by round:', rounds);

  const r32Matches = await prisma.match.findMany({
    where: { round: 'round-of-32' },
    orderBy: { apiFootballId: 'asc' },
  });
  console.log(`Found ${r32Matches.length} matches with round = "round-of-32"`);
  r32Matches.forEach(m => {
    console.log(`MatchNum: ${m.apiFootballId}, HomeLabel: ${m.homeTeamLabel}, AwayLabel: ${m.awayTeamLabel}, Kickoff: ${m.kickoffTimeUTC}, Status: ${m.status}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
