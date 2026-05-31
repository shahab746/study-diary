const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function main() {
  console.log('🔧 Fixing broken video and PDF links in the database...\n');

  // Get all topics with non-empty videoLink or pdfLink
  const topics = await db.topic.findMany({
    where: {
      OR: [
        { videoLink: { not: '' } },
        { pdfLink: { not: '' } },
      ],
    },
    select: {
      id: true,
      name: true,
      videoLink: true,
      pdfLink: true,
    },
  });

  console.log(`Found ${topics.length} topics with video or PDF links.\n`);

  let videoFixed = 0;
  let pdfFixed = 0;
  let videoAlreadyOk = 0;
  let pdfAlreadyOk = 0;

  for (const topic of topics) {
    const updates: { videoLink?: string; pdfLink?: string } = {};

    // Fix video links
    if (topic.videoLink && topic.videoLink.trim() !== '') {
      const trimmed = topic.videoLink.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        videoAlreadyOk++;
      } else {
        // It's a search term — convert to YouTube search URL
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(trimmed)}`;
        updates.videoLink = searchUrl;
        videoFixed++;
      }
    }

    // Fix PDF links
    if (topic.pdfLink && topic.pdfLink.trim() !== '') {
      const trimmed = topic.pdfLink.trim();
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        pdfAlreadyOk++;
      } else {
        // It's just a filename — set to empty string
        updates.pdfLink = '';
        pdfFixed++;
      }
    }

    if (Object.keys(updates).length > 0) {
      await db.topic.update({
        where: { id: topic.id },
        data: updates,
      });
    }
  }

  console.log('--- Results ---');
  console.log(`Video links already OK (URLs): ${videoAlreadyOk}`);
  console.log(`Video links fixed (search terms → YouTube search URLs): ${videoFixed}`);
  console.log(`PDF links already OK (URLs): ${pdfAlreadyOk}`);
  console.log(`PDF links fixed (filenames → empty string): ${pdfFixed}`);
  console.log('\n✅ Done!');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
