import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: ['error'],
});

const SUBJECT_CONFIG: Record<string, { color: string; icon: string; order: number; total: number; chapters: number }> = {
  'Physics': { color: 'Blue', icon: '⚛️', order: 1, total: 91, chapters: 9 },
  'Chemistry': { color: 'Teal', icon: '🧪', order: 2, total: 132, chapters: 7 },
  'Computer Science': { color: 'Purple', icon: '💻', order: 3, total: 65, chapters: 7 },
  'Biology': { color: 'Green', icon: '🧬', order: 4, total: 150, chapters: 9 },
  'Maths': { color: 'Amber', icon: '📐', order: 5, total: 101, chapters: 13 },
};

// Simplified chapter data based on the spreadsheet
const CHAPTERS: Record<string, { name: string; topicCount: number }[]> = {
  'Physics': [
    { name: 'Simple Harmonic Motion and Waves', topicCount: 5 },
    { name: 'Sound', topicCount: 8 },
    { name: 'Geometrical Optics', topicCount: 16 },
    { name: 'Electrostatics', topicCount: 10 },
    { name: 'Current Electricity', topicCount: 13 },
    { name: 'Electromagnetism', topicCount: 10 },
    { name: 'Introductory Electronics', topicCount: 11 },
    { name: 'Information and Communication Technology', topicCount: 9 },
    { name: 'Atomic and Nuclear Physics', topicCount: 9 },
  ],
  'Chemistry': [
    { name: 'Chemical Equilibrium', topicCount: 13 },
    { name: 'Acids, Bases and Salts', topicCount: 18 },
    { name: 'Organic Chemistry', topicCount: 9 },
    { name: 'Environmental Chemistry', topicCount: 20 },
    { name: 'The Atmosphere', topicCount: 18 },
    { name: 'Water', topicCount: 30 },
    { name: 'Chemical Industries', topicCount: 24 },
  ],
  'Computer Science': [
    { name: 'Problem Solving', topicCount: 8 },
    { name: 'Data Types, Assignment and I/O Statements', topicCount: 10 },
    { name: 'Control Structures', topicCount: 10 },
    { name: 'Data Structures', topicCount: 10 },
    { name: 'Subprograms and File Handling', topicCount: 9 },
    { name: 'Graphics in BASIC', topicCount: 8 },
    { name: 'Microsoft Word', topicCount: 10 },
  ],
  'Biology': [
    { name: 'Gaseous Exchange', topicCount: 15 },
    { name: 'Homeostasis', topicCount: 18 },
    { name: 'Coordination and Control', topicCount: 20 },
    { name: 'Support and Movement', topicCount: 16 },
    { name: 'Reproduction', topicCount: 18 },
    { name: 'Inheritance', topicCount: 17 },
    { name: 'Man and His Environment', topicCount: 14 },
    { name: 'Biotechnology', topicCount: 16 },
    { name: 'Pharmacology', topicCount: 16 },
  ],
  'Maths': [
    { name: 'Quadratic Equations', topicCount: 8 },
    { name: 'Theory of Quadratic Equations', topicCount: 7 },
    { name: 'Variations', topicCount: 8 },
    { name: 'Partial Fractions', topicCount: 7 },
    { name: 'Sets and Functions', topicCount: 8 },
    { name: 'Basic Statistics', topicCount: 8 },
    { name: 'Probability', topicCount: 7 },
    { name: 'Introduction to Trigonometry', topicCount: 8 },
    { name: 'Projection of a Side of a Triangle', topicCount: 7 },
    { name: 'Chords of a Circle', topicCount: 8 },
    { name: 'Tangent to a Circle', topicCount: 8 },
    { name: 'Chords and Arcs', topicCount: 8 },
    { name: 'Angle in a Segment of a Circle', topicCount: 7 },
  ],
};

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.progress.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.specialCourse.deleteMany();
  await prisma.config.deleteMany();
  await prisma.student.deleteMany();

  // Create Student
  const student = await prisma.student.create({
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
  console.log(`✅ Created student: ${student.name}`);

  // Create subjects with chapters and topics
  let dayCounter = 1;
  let totalTopics = 0;

  for (const [subjectName, config] of Object.entries(SUBJECT_CONFIG)) {
    const subject = await prisma.subject.create({
      data: {
        name: subjectName,
        grade: 'Grade 10',
        board: 'BISE Abbottabad',
        field: 'Science',
        totalTopics: config.total,
        chapterCount: config.chapters,
        color: config.color,
        icon: config.icon,
        order: config.order,
      },
    });

    const chapters = CHAPTERS[subjectName] || [];
    for (let i = 0; i < chapters.length; i++) {
      const chapterData = chapters[i];
      const chapter = await prisma.chapter.create({
        data: {
          subjectId: subject.id,
          number: i + 1,
          name: chapterData.name,
        },
      });

      for (let t = 1; t <= chapterData.topicCount; t++) {
        await prisma.topic.create({
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
    console.log(`✅ ${subjectName}: ${chapters.length} chapters`);
  }
  console.log(`✅ Total topics: ${totalTopics}`);

  // Create Special Courses
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
    await prisma.specialCourse.create({
      data: {
        ...course,
        videoLink: '',
        pdfLink: '',
        grade: 'Grade 10',
        board: 'BISE Abbottabad',
      },
    });
  }
  console.log(`✅ Special courses: ${specialCourses.length}`);

  // Create Config
  const configs = [
    { key: 'Is_Weekend', value: 'TRUE' },
    { key: 'App_Version', value: '1' },
    { key: 'Active', value: '1' },
    { key: 'Total_Topics', value: '539' },
  ];
  for (const config of configs) {
    await prisma.config.create({ data: config });
  }

  console.log('🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
