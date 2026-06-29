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
          apiFootballId: matchIdCounter,
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
  
  const KNOCKOUT_KICKOFFS: Record<number, string> = {
    73: '2026-06-28T19:00:00Z',
    74: '2026-06-29T20:30:00Z',
    75: '2026-06-30T01:00:00Z',
    76: '2026-06-29T17:00:00Z',
    77: '2026-06-30T21:00:00Z',
    78: '2026-06-30T17:00:00Z',
    79: '2026-07-01T01:00:00Z',
    80: '2026-07-01T16:00:00Z',
    81: '2026-07-02T00:00:00Z',
    82: '2026-07-01T20:00:00Z',
    83: '2026-07-02T23:00:00Z',
    84: '2026-07-02T19:00:00Z',
    85: '2026-07-03T03:00:00Z',
    86: '2026-07-03T22:00:00Z',
    87: '2026-07-04T01:30:00Z',
    88: '2026-07-03T18:00:00Z',
    89: '2026-07-04T21:00:00Z',
    90: '2026-07-04T17:00:00Z',
    91: '2026-07-05T20:00:00Z',
    92: '2026-07-06T00:00:00Z',
    93: '2026-07-06T19:00:00Z',
    94: '2026-07-07T00:00:00Z',
    95: '2026-07-07T16:00:00Z',
    96: '2026-07-07T20:00:00Z',
    97: '2026-07-09T20:00:00Z',
    98: '2026-07-10T19:00:00Z',
    99: '2026-07-11T21:00:00Z',
    100: '2026-07-12T01:00:00Z',
    101: '2026-07-14T19:00:00Z',
    102: '2026-07-15T19:00:00Z',
    103: '2026-07-18T21:00:00Z',
    104: '2026-07-19T19:00:00Z'
  };

  for (let i = 0; i < 32; i++) {
    const matchNum = 73 + i;
    const kickoffStr = KNOCKOUT_KICKOFFS[matchNum];
    await prisma.match.create({
      data: {
        apiFootballId: matchNum,
        // homeTeamId and awayTeamId left null as TBD placeholders
        kickoffTimeUTC: new Date(kickoffStr),
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
