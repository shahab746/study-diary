import { db } from '@/lib/db';
import curriculumFull from './curriculum_full.json';

interface CurriculumEntry {
  subject: string;
  chapter_no: number;
  chapter_name: string;
  topic_no: number;
  topic_name: string;
  has_video: boolean;
  video_url: string;
  has_pdf: boolean;
  pdf_url: string;
}

const SUBJECT_CONFIG: Record<string, { color: string; icon: string; order: number; total: number; chapters: number }> = {
  'Physics': { color: 'Blue', icon: '⚛️', order: 1, total: 91, chapters: 9 },
  'Chemistry': { color: 'Teal', icon: '🧪', order: 2, total: 132, chapters: 7 },
  'Computer Science': { color: 'Purple', icon: '💻', order: 3, total: 65, chapters: 7 },
  'Biology': { color: 'Green', icon: '🧬', order: 4, total: 150, chapters: 9 },
  'Maths': { color: 'Amber', icon: '📐', order: 5, total: 101, chapters: 13 },
};

const MATHS_CHAPTERS = [
  'Quadratic Equations', 'Theory of Quadratic Equations', 'Variations',
  'Partial Fractions', 'Sets and Functions', 'Basic Statistics',
  'Probability', 'Introduction to Trigonometry', 'Projection of a Side of a Triangle',
  'Chords of a Circle', 'Tangent to a Circle', 'Chords and Arcs',
  'Angle in a Segment of a Circle',
];

async function main() {
  console.log('🌱 Seeding database with REAL links...');

  // Clean up
  await db.progress.deleteMany();
  await db.topic.deleteMany();
  await db.chapter.deleteMany();
  await db.subject.deleteMany();
  await db.specialCourse.deleteMany();
  await db.config.deleteMany();
  await db.student.deleteMany();

  // Create Student
  await db.student.create({
    data: {
      name: 'Ali',
      phone: '03360883355',
      grade: 10,
      board: 'BISE Abbottabad',
      field: 'Science',
      status: 'paid',
      startDate: new Date('2026-05-16'),
      targetDate: new Date('2027-07-28'),
      currentDay: 16,
      totalDays: 438,
      topicsDone: 0,
      daysLeft: 423,
      pacingGoal: '5M',
      pin: '1234',
    },
  });
  console.log('✅ Student created');

  const data = curriculumFull as CurriculumEntry[];

  // Group by subject -> chapter
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

  // Create subjects from spreadsheet data using nested creates
  for (const [subjectName, chaptersMap] of subjectMap) {
    const config = SUBJECT_CONFIG[subjectName] || { color: 'Gray', icon: '📚', order: 99, total: 0, chapters: 0 };

    const sortedChapters = [...chaptersMap.entries()].sort((a, b) => {
      const numA = parseInt(a[0].split('|||')[0]);
      const numB = parseInt(b[0].split('|||')[0]);
      return numA - numB;
    });

    // Create subject with nested chapters and topics in one call
    await db.subject.create({
      data: {
        name: subjectName,
        grade: 'Grade 10',
        board: 'BISE Abbottabad',
        field: 'Science',
        totalTopics: config.total,
        chapterCount: chaptersMap.size,
        color: config.color,
        icon: config.icon,
        order: config.order,
        chapters: {
          create: sortedChapters.map(([chKey, topics]) => {
            const [numStr, chName] = chKey.split('|||');
            const chapterNo = parseInt(numStr);
            const currentDayStart = dayCounter;
            const topicData = topics.map((topic, idx) => ({
              number: topic.topic_no,
              name: topic.topic_name,
              videoLink: topic.has_video ? topic.video_url : '',
              pdfLink: topic.has_pdf ? topic.pdf_url : '',
              isFree: true,
              dayNumber: currentDayStart + idx,
            }));
            dayCounter += topics.length;
            totalTopics += topics.length;
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

    const totalSubjectTopics = [...chaptersMap.values()].reduce((s, t) => s + t.length, 0);
    console.log(`✅ ${subjectName}: ${chaptersMap.size} chapters, ${totalSubjectTopics} topics`);
  }

  // Create Maths subject (placeholder)
  const mathsConfig = SUBJECT_CONFIG['Maths'];
  await db.subject.create({
    data: {
      name: 'Maths',
      grade: 'Grade 10',
      board: 'BISE Abbottabad',
      field: 'Science',
      totalTopics: mathsConfig.total,
      chapterCount: mathsConfig.chapters,
      color: mathsConfig.color,
      icon: mathsConfig.icon,
      order: mathsConfig.order,
      chapters: {
        create: MATHS_CHAPTERS.map((chName, i) => {
          let topicCount: number;
          if (i < 12) {
            topicCount = Math.floor(mathsConfig.total / mathsConfig.chapters);
          } else {
            topicCount = mathsConfig.total - Math.floor(mathsConfig.total / mathsConfig.chapters) * 12;
          }
          const topicData = Array.from({ length: topicCount }, (_, t) => ({
            number: t + 1,
            name: `Topic ${i + 1}.${t + 1}`,
            videoLink: '',
            pdfLink: '',
            isFree: true,
            dayNumber: dayCounter++,
          }));
          totalTopics += topicCount;
          return {
            number: i + 1,
            name: chName,
            topics: {
              create: topicData,
            },
          };
        }),
      },
    },
  });
  console.log(`✅ Maths: ${MATHS_CHAPTERS.length} chapters (placeholder)`);

  // Special Courses
  await db.specialCourse.createMany({
    data: [
      { name: 'Past Papers 2025', subject: 'Physics', topic: 'Full paper walkthrough', order: 1, videoLink: '', pdfLink: '', grade: 'Grade 10', board: 'BISE Abbottabad' },
      { name: 'Past Papers 2025', subject: 'Chemistry', topic: 'Full paper walkthrough', order: 2, videoLink: '', pdfLink: '', grade: 'Grade 10', board: 'BISE Abbottabad' },
      { name: 'Past Papers 2025', subject: 'Biology', topic: 'Full paper walkthrough', order: 3, videoLink: '', pdfLink: '', grade: 'Grade 10', board: 'BISE Abbottabad' },
      { name: 'Past Papers 2025', subject: 'Maths', topic: 'Full paper walkthrough', order: 4, videoLink: '', pdfLink: '', grade: 'Grade 10', board: 'BISE Abbottabad' },
      { name: 'MCQ Practice', subject: 'All', topic: 'Mixed subject MCQs', order: 5, videoLink: '', pdfLink: '', grade: 'Grade 10', board: 'BISE Abbottabad' },
      { name: 'Numerical Practice', subject: 'Physics', topic: 'Important numericals', order: 6, videoLink: '', pdfLink: '', grade: 'Grade 10', board: 'BISE Abbottabad' },
      { name: 'Formula Sheet', subject: 'All', topic: 'Quick reference formulas', order: 7, videoLink: '', pdfLink: '', grade: 'Grade 10', board: 'BISE Abbottabad' },
      { name: 'Revision Notes', subject: 'All', topic: 'Condensed chapter summaries', order: 8, videoLink: '', pdfLink: '', grade: 'Grade 10', board: 'BISE Abbottabad' },
    ],
  });

  // Config
  await db.config.createMany({
    data: [
      { key: 'Is_Weekend', value: 'TRUE' },
      { key: 'App_Version', value: '1' },
      { key: 'Active', value: '1' },
      { key: 'Total_Topics', value: String(totalTopics) },
    ],
  });

  console.log(`✅ Total topics: ${totalTopics}`);
  console.log('🎉 Seeding with REAL links complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
