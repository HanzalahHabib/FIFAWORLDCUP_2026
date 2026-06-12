import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const teams = [
  { name: 'USA', group: 'A' }, { name: 'Mexico', group: 'A' }, { name: 'Canada', group: 'A' }, { name: 'Brazil', group: 'A' },
  { name: 'Argentina', group: 'B' }, { name: 'France', group: 'B' }, { name: 'England', group: 'B' }, { name: 'Spain', group: 'B' },
  { name: 'Germany', group: 'C' }, { name: 'Portugal', group: 'C' }, { name: 'Netherlands', group: 'C' }, { name: 'Italy', group: 'C' },
  { name: 'Belgium', group: 'D' }, { name: 'Croatia', group: 'D' }, { name: 'Uruguay', group: 'D' }, { name: 'Colombia', group: 'D' },
  { name: 'Senegal', group: 'E' }, { name: 'Morocco', group: 'E' }, { name: 'Japan', group: 'E' }, { name: 'South Korea', group: 'E' },
  { name: 'Iran', group: 'F' }, { name: 'Saudi Arabia', group: 'F' }, { name: 'Australia', group: 'F' }, { name: 'Qatar', group: 'F' },
  { name: 'Egypt', group: 'G' }, { name: 'Algeria', group: 'G' }, { name: 'Nigeria', group: 'G' }, { name: 'Cameroon', group: 'G' },
  { name: 'Ghana', group: 'H' }, { name: 'Mali', group: 'H' }, { name: 'Ivory Coast', group: 'H' }, { name: 'Tunisia', group: 'H' },
  { name: 'Ecuador', group: 'I' }, { name: 'Peru', group: 'I' }, { name: 'Chile', group: 'I' }, { name: 'Venezuela', group: 'I' },
  { name: 'Paraguay', group: 'J' }, { name: 'Bolivia', group: 'J' }, { name: 'Sweden', group: 'J' }, { name: 'Switzerland', group: 'J' },
  { name: 'Denmark', group: 'K' }, { name: 'Poland', group: 'K' }, { name: 'Serbia', group: 'K' }, { name: 'Wales', group: 'K' },
  { name: 'Scotland', group: 'L' }, { name: 'Ukraine', group: 'L' }, { name: 'Austria', group: 'L' }, { name: 'Turkey', group: 'L' },
];

async function main() {
  console.log('Start seeding... Clearing previous match data...');
  
  // Clear old matches if any (to prevent duplicates)
  await prisma.pick.deleteMany({});
  await prisma.match.deleteMany({});

  const groupMap: Record<string, { id: string, name: string }[]> = {};

  for (const t of teams) {
    const team = await prisma.team.upsert({
      where: { name: t.name },
      update: { group: t.group },
      create: { name: t.name, group: t.group },
    });
    
    if (!groupMap[t.group]) groupMap[t.group] = [];
    groupMap[t.group].push({ id: team.id, name: team.name });
  }

  console.log('Teams generated. Creating 72 Group Stage matches...');

  const startDate = new Date('2026-06-11T12:00:00Z');
  let matchIdCounter = 1;

  // Generate Group Stage Matches (72 matches)
  for (const group of Object.keys(groupMap).sort()) {
    const groupTeams = groupMap[group];
    // Simple Round Robin (4 teams = 6 matches)
    const matchups = [
      [0, 1], [2, 3],
      [0, 2], [1, 3],
      [0, 3], [1, 2]
    ];

    let matchDayOffset = 0;
    for (const [homeIdx, awayIdx] of matchups) {
      const matchDate = new Date(startDate.getTime() + (matchDayOffset * 24 * 60 * 60 * 1000));
      
      await prisma.match.create({
        data: {
          apiFootballId: 2026000 + matchIdCounter,
          homeTeamId: groupTeams[homeIdx].id,
          awayTeamId: groupTeams[awayIdx].id,
          kickoffTimeUTC: matchDate,
          status: 'SCHEDULED',
        }
      });
      matchIdCounter++;
      matchDayOffset += 2; // Spread matches out
    }
  }

  console.log('Creating 32 Knockout Stage placeholders...');
  // 32 Knockout matches = 16 (R32) + 8 (R16) + 4 (QF) + 2 (SF) + 1 (3rd) + 1 (Final)
  let knockoutDate = new Date('2026-06-28T12:00:00Z');
  
  for (let i = 0; i < 32; i++) {
    await prisma.match.create({
      data: {
        apiFootballId: 2026100 + i,
        // homeTeamId and awayTeamId left null as TBD placeholders
        kickoffTimeUTC: new Date(knockoutDate.getTime() + (i * 12 * 60 * 60 * 1000)),
        status: 'SCHEDULED',
      }
    });
  }

  console.log('Successfully seeded 104 World Cup matches.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
