'use client';

import { motion } from 'framer-motion';
import { useStudyOS, SpecialCourseItem } from '@/lib/store';
import { FileText, Video, BookOpen } from 'lucide-react';

function CourseCard({ course, index }: { course: SpecialCourseItem; index: number }) {
  const iconMap: Record<string, React.ReactNode> = {
    'Past Papers': <FileText className="w-3.5 h-3.5" />,
    'MCQ Practice': <BookOpen className="w-3.5 h-3.5" />,
    'Numerical Practice': <BookOpen className="w-3.5 h-3.5" />,
    'Formula Sheet': <FileText className="w-3.5 h-3.5" />,
    'Revision Notes': <Video className="w-3.5 h-3.5" />,
  };

  const getIcon = (name: string) => {
    if (name.includes('Past Papers')) return iconMap['Past Papers'];
    if (name.includes('MCQ')) return iconMap['MCQ Practice'];
    if (name.includes('Numerical')) return iconMap['Numerical Practice'];
    if (name.includes('Formula')) return iconMap['Formula Sheet'];
    if (name.includes('Revision')) return iconMap['Revision Notes'];
    return <FileText className="w-3.5 h-3.5" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      whileTap={{ scale: 0.97 }}
      className="glass rounded-lg p-3 cursor-pointer hover:bg-secondary/50 transition-colors duration-200"
    >
      <div className="flex items-center gap-2.5">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          {getIcon(course.name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium truncate">{course.name}</p>
          <p className="text-[10px] text-muted-foreground font-mono truncate">
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
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-display text-sm font-bold tracking-tight">Revision Dock</h2>
        <span className="text-[9px] text-muted-foreground font-mono px-1.5 py-0.5 bg-secondary rounded-md">
          UTILITY
        </span>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {specialCourses.map((course, index) => (
          <CourseCard key={course.id} course={course} index={index} />
        ))}
      </div>
    </div>
  );
}
