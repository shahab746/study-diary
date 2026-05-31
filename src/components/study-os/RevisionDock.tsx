'use client';

import { motion } from 'framer-motion';
import { useStudyOS, SpecialCourseItem } from '@/lib/store';
import { FileText, Video, BookOpen } from 'lucide-react';

function CourseCard({ course, index }: { course: SpecialCourseItem; index: number }) {
  const iconMap: Record<string, React.ReactNode> = {
    'Past Papers': <FileText className="w-4 h-4" />,
    'MCQ Practice': <BookOpen className="w-4 h-4" />,
    'Numerical Practice': <BookOpen className="w-4 h-4" />,
    'Formula Sheet': <FileText className="w-4 h-4" />,
    'Revision Notes': <Video className="w-4 h-4" />,
  };

  // Determine icon based on course name
  const getIcon = (name: string) => {
    if (name.includes('Past Papers')) return iconMap['Past Papers'];
    if (name.includes('MCQ')) return iconMap['MCQ Practice'];
    if (name.includes('Numerical')) return iconMap['Numerical Practice'];
    if (name.includes('Formula')) return iconMap['Formula Sheet'];
    if (name.includes('Revision')) return iconMap['Revision Notes'];
    return <FileText className="w-4 h-4" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.97 }}
      className="glass rounded-xl p-3 cursor-pointer hover:bg-secondary/50 transition-colors duration-200"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {getIcon(course.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{course.name}</p>
          <p className="text-xs text-muted-foreground font-mono truncate">
            {course.subject} — {course.topic}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export function RevisionDock() {
  const { specialCourses } = useStudyOS();

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-display text-lg font-bold tracking-tight">Revision Dock</h2>
        <span className="text-xs text-muted-foreground font-mono px-2 py-0.5 bg-secondary rounded-md">
          UTILITY SHELF
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {specialCourses.map((course, index) => (
          <CourseCard key={course.id} course={course} index={index} />
        ))}
      </div>
    </div>
  );
}
