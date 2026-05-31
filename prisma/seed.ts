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

// Placeholder chapters for Maths (not in spreadsheet)
const MATHS_CHAPTERS = [
  'Quadratic Equations', 'Theory of Quadratic Equations', 'Variations',
  'Partial Fractions', 'Sets and Functions', 'Basic Statistics',
  'Probability', 'Introduction to Trigonometry', 'Projection of a Side of a Triangle',
  'Chords of a Circle', 'Tangent to a Circle', 'Chords and Arcs',
  'Angle in a Segment of a Circle',
];

async function main() {
  console.log('🌱 Seeding database with REAL links...');

  await db.progress.deleteMany();
  await db.topic.deleteMany()
;  await db.chapter.deleteMany();
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

  // Create subjects from spreadsheet data
  for (const [subjectName, chaptersMap] of subjectMap) {
    const config = SUBJECT_CONFIG[subjectName] || { color: 'Gray', icon: '📚', order: 99, total: 0, chapters: 0 };

    const subject = await db.subject.create({
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
      },
    });

    // Create chapters and topics with REAL links
    const sortedChapters = [...chaptersMap.entries()].sort((a, b) => {
      const numA = parseInt(a[0].split('|||')[0]);
      const numB = parseInt(b[0].split('|||')[0]);
      return numA - numB;
    });

    for (const [chKey, topics] of sortedChapters) {
      const [numStr, chName] = chKey.split('|||');
      const chapterNo = parseInt(numStr);

      const chapter = await db.chapter.create({
        data: {
          subjectId: subject.id,
          number: chapterNo,
          name: chName,
        },
      });

      for (const topic of topics) {
        await db.topic.create({
          data: {
            chapterId: chapter.id,
            number: topic.topic_no,
            name: topic.topic_name,
            videoLink: topic.has_video ? topic.video_url : '',
            pdfLink: topic.has_pdf ? topic.pdf_url : '',
            isFree: true,
            dayNumber: dayCounter++,
          },
        });
        totalTopics++;
      }
    }
    console.log(`✅ ${subjectName}: ${chaptersMap.size} chapters, ${[...chaptersMap.values()].reduce((s, t) => s + t.length, 0)} topics (with REAL links)`);
  }

  // Create Maths subject (placeholder)
  const mathsConfig = SUBJECT_CONFIG['Maths'];
  const mathsSubject = await db.subject.create({
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
    },
  });

  for (let i = 0; i < MATHS_CHAPTERS.length; i++) {
    const chapter = await db.chapter.create({
      data: {
        subjectId: mathsSubject.id,
        number: i + 1,
        name: MATHS_CHAPTERS[i],
      },
    });
    const topicCount = Math.ceil(mathsConfig.total / mathsConfig.chapters);
    for (let t = 1; t <= topicCount; t++) {
      await db.topic.create({
        data: {
          chapterId: chapter.id,
          number: t,
          name: `Topic ${i + 1}.${t}`,
          videoLink: '',
          pdfLink: '',
          isFree: true,
          dayNumber: dayCounter++,
        },
      });
      totalTopics++;
    }
  }
  console.log(`✅ Maths: ${MATHS_CHAPTERS.length} chapters (placeholder)`);

  // Special Courses
  const specialCourses = [
    { name: 'Past Papers 2025', subject: 'Physics', topic: 'Full paper walkthrough', order: 1 },
    { name: 'Past Papers 2025', subject: 'Chemistry', topic: 'Full paper walkthrough', order: 2 },
    { name: 'Past Papers 2025', subject: 'Biology', topic: 'Full paper walkthrough', order: 3 },
    { name: 'Past Papers 2025', subject: 'Maths', topic: 'Full paper walkthrough', order: 4 },
    { name: 'MCQ Practice', subject: 'All', topic: 'Mixed subject MCQs', order: 5 },
    { name: 'Numerical Practice', subject: 'Physics', topic: 'Important numericals', order: 6 },
    { name: 'Formula Sheet', subject: 'All', topic: 'Quick reference formulas', order: 7 },
    { name: 'Revision Notes', subject: 'All', topic: 'Condensed chapter summaries', order: 8 },
  ];
  for (const course of specialCourses) {
    await db.specialCourse.create({
      data: { ...course, videoLink: '', pdfLink: '', grade: 'Grade 10', board: 'BISE Abbottabad' },
    });
  }

  // Config
  for (const c of [
    { key: 'Is_Weekend', value: 'TRUE' },
    { key: 'App_Version', value: '1' },
    { key: 'Active', value: '1' },
    { key: 'Total_Topics', value: String(totalTopics) },
  ]) {
    await db.config.create({ data: c });
  }

  console.log(`✅ Total topics: ${totalTopics}`);
  console.log('🎉 Seeding with REAL links complete!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
