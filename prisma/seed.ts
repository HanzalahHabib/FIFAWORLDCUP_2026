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
  console.log('Start seeding...');
  
  for (const t of teams) {
    const team = await prisma.team.upsert({
      where: { name: t.name },
      update: {},
      create: {
        name: t.name,
        group: t.group,
      },
    });
    console.log(`Created team with id: ${team.id}`);
  }

  // Optionally create some mock matches
  const usa = await prisma.team.findUnique({ where: { name: 'USA' } });
  const mexico = await prisma.team.findUnique({ where: { name: 'Mexico' } });

  if (usa && mexico) {
    // A match in the past
    await prisma.match.create({
      data: {
        homeTeamId: usa.id,
        awayTeamId: mexico.id,
        kickoffTimeUTC: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        status: 'FINISHED',
        homeScore: 2,
        awayScore: 1,
      }
    });

    // A match in the future
    await prisma.match.create({
      data: {
        homeTeamId: mexico.id,
        awayTeamId: usa.id,
        kickoffTimeUTC: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
        status: 'SCHEDULED',
      }
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
