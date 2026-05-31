import { db } from '@/lib/db';
import curriculumGrade9 from './curriculum_grade9.json';

// Grade 9 curriculum entry interface matching the JSON structure
interface CurriculumEntry {
  grade: string;
  board: string;
  field: string;
  subject: string;
  chapter_no: string;
  chapter_name: string;
  topic_no: string;
  topic_name: string;
  video_link: string;
  pdf_link: string;
  is_free: string;
  color: string;
}

// Subject configuration for Grade 9
const SUBJECT_CONFIG: Record<string, { color: string; icon: string; order: number }> = {
  'Physics': { color: 'Blue', icon: 'atom', order: 1 },
  'Chemistry': { color: 'Teal', icon: 'flask-conical', order: 2 },
  'Biology': { color: 'Green', icon: 'leaf', order: 3 },
  'Maths': { color: 'Amber', icon: 'sigma', order: 4 },
};

async function main() {
  console.log('🌱 Seeding Grade 9 curriculum data...');

  const data = curriculumGrade9 as CurriculumEntry[];

  // Check if Grade 9 subjects already exist
  const existingGrade9 = await db.subject.findMany({
    where: { grade: '9' },
  });

  if (existingGrade9.length > 0) {
    console.log(`⚠️  Found ${existingGrade9.length} existing Grade 9 subjects. Deleting them first...`);
    // Delete in correct order: topics -> chapters -> subjects (cascade should handle this)
    for (const subject of existingGrade9) {
      await db.subject.delete({ where: { id: subject.id } });
    }
    console.log('✅ Existing Grade 9 data deleted');
  }

  // Group entries by subject -> chapter
  const subjectMap = new Map<string, Map<string, CurriculumEntry[]>>();
  for (const entry of data) {
    if (!subjectMap.has(entry.subject)) {
      subjectMap.set(entry.subject, new Map());
    }
    const chapters = subjectMap.get(entry.subject)!;
    const chKey = `${entry.chapter_no}|||${entry.chapter_name}`;
    if (!chapters.has(chKey)) {
      chapters.set(chKey, []);
    }
    chapters.get(chKey)!.push(entry);
  }

  let dayCounter = 1;
  let totalTopics = 0;

  // Define subject order for consistent processing
  const subjectOrder = ['Physics', 'Chemistry', 'Biology', 'Maths'];

  for (const subjectName of subjectOrder) {
    const chaptersMap = subjectMap.get(subjectName);
    if (!chaptersMap) {
      console.log(`⚠️  No data found for ${subjectName}, skipping...`);
      continue;
    }

    const config = SUBJECT_CONFIG[subjectName];
    if (!config) {
      console.log(`⚠️  No config for ${subjectName}, skipping...`);
      continue;
    }

    // Sort chapters by chapter number
    const sortedChapters = [...chaptersMap.entries()].sort((a, b) => {
      const numA = parseInt(a[0].split('|||')[0]);
      const numB = parseInt(b[0].split('|||')[0]);
      return numA - numB;
    });

    // Calculate total topics for this subject
    const subjectTopicCount = [...chaptersMap.values()].reduce((sum, topics) => sum + topics.length, 0);

    // Create subject with nested chapters and topics
    await db.subject.create({
      data: {
        name: subjectName,
        grade: '9',
        board: 'BISE Abbottabad',
        field: 'Science',
        totalTopics: subjectTopicCount,
        chapterCount: chaptersMap.size,
        color: config.color,
        icon: config.icon,
        order: config.order,
        chapters: {
          create: sortedChapters.map(([chKey, topics]) => {
            const [numStr, chName] = chKey.split('|||');
            const chapterNo = parseInt(numStr);

            const topicData = topics.map((topic) => {
              const isFree = topic.is_free === 'TRUE';
              const dayNumber = dayCounter++;
              totalTopics++;
              return {
                number: parseInt(topic.topic_no),
                name: topic.topic_name,
                videoLink: topic.video_link || '',
                pdfLink: topic.pdf_link || '',
                isFree,
                dayNumber,
              };
            });

            return {
              number: chapterNo,
              name: chName,
              topics: {
                create: topicData,
              },
            };
          }),
        },
      },
    });

    console.log(`✅ ${subjectName} (Grade 9): ${chaptersMap.size} chapters, ${subjectTopicCount} topics`);
  }

  console.log(`\n📊 Total Grade 9 topics seeded: ${totalTopics}`);
  console.log('🎉 Grade 9 curriculum seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
