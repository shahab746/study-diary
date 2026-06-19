'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useStudyOS, SubjectDetail, SubjectDetailChapter, SubjectDetailTopic } from '@/lib/store';
import { Check, ChevronDown, ArrowLeft, Play, FileText, BookOpen, Zap } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

const COLOR_HEX: Record<string, string> = {
  'Blue': '#38BDF8',
  'Teal': '#2DD4BF',
  'Purple': '#A78BFA',
  'Green': '#34D399',
  'Amber': '#FBBF24',
};

const COLOR_TEXT: Record<string, string> = {
  'Blue': 'text-sky-400',
  'Teal': 'text-teal-400',
  'Purple': 'text-violet-400',
  'Green': 'text-emerald-400',
  'Amber': 'text-amber-400',
};

const COLOR_BG: Record<string, string> = {
  'Blue': 'bg-sky-500/10',
  'Teal': 'bg-teal-500/10',
  'Purple': 'bg-violet-500/10',
  'Green': 'bg-emerald-500/10',
  'Amber': 'bg-amber-500/10',
};

const COLOR_GRADIENT: Record<string, string> = {
  'Blue': 'from-blue-500 to-blue-600',
  'Teal': 'from-teal-500 to-teal-600',
  'Purple': 'from-purple-500 to-purple-600',
  'Green': 'from-green-500 to-green-600',
  'Amber': 'from-amber-500 to-amber-600',
};

const COLOR_TAG: Record<string, { bg: string; text: string }> = {
  'Blue': { bg: 'bg-sky-500/10', text: 'text-sky-300' },
  'Teal': { bg: 'bg-teal-500/10', text: 'text-teal-300' },
  'Purple': { bg: 'bg-violet-500/10', text: 'text-violet-300' },
  'Green': { bg: 'bg-emerald-500/10', text: 'text-emerald-300' },
  'Amber': { bg: 'bg-amber-500/10', text: 'text-amber-300' },
};

function TopicRow({
  topic,
  subjectColor,
  onToggle,
  isHighlighted,
  highlightRef,
}: {
  topic: SubjectDetailTopic;
  subjectColor: string;
  onToggle: (id: string) => void;
  isHighlighted?: boolean;
  highlightRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [isAnimating, setIsAnimating] = useState(false);
  const colorHex = COLOR_HEX[subjectColor] || COLOR_HEX['Amber'];
  const colorText = COLOR_TEXT[subjectColor] || 'text-amber-500';
  const colorTag = COLOR_TAG[subjectColor] || COLOR_TAG['Amber'];

  const handleToggle = () => {
    setIsAnimating(true);
    onToggle(topic.id);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <motion.div
      ref={isHighlighted ? highlightRef : undefined}
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
      className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
        ${topic.completed ? 'opacity-50' : 'hover:bg-secondary/50'}
        ${isHighlighted ? 'bg-primary/10 ring-1 ring-primary/30' : ''}`}
    >
      {/* Checkbox */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={handleToggle}
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200
          ${topic.completed
            ? `${colorTag.bg}`
            : 'border-2 border-muted-foreground/25 hover:border-primary'
          } ${isAnimating ? 'haptic-click' : ''}`}
      >
        {topic.completed && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 20 }}
          >
            <Check className={`w-3.5 h-3.5 ${colorText}`} />
          </motion.div>
        )}
      </motion.button>

      {/* Topic Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${topic.completed ? 'line-through text-muted-foreground' : ''}`}>
          <span className={`font-mono text-xs ${colorText} mr-2`}>
            {topic.number}.
          </span>
          {topic.name}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
        </div>
      </div>

      {/* Action Buttons — Premium Micro-Badges */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {topic.hasVideo && topic.videoLink && (
          <a
            href={topic.videoLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group/badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-display font-bold tracking-wide uppercase
              bg-rose-500/10 text-rose-400 border border-rose-500/20
              hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300 hover:shadow-[0_0_12px_rgba(244,63,94,0.15)]
              active:scale-95
              transition-all duration-200 ease-out
              group-hover:opacity-100 sm:opacity-70"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="hidden sm:inline">Watch</span>
          </a>
        )}

        {topic.hasPdf && topic.pdfLink && (
          <a
            href={topic.pdfLink}
            target="_blank"
            rel="noopener noreferrer"
            className="group/badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-display font-bold tracking-wide uppercase
              bg-emerald-500/10 text-emerald-400 border border-emerald-500/20
              hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-300 hover:shadow-[0_0_12px_rgba(16,185,129,0.15)]
              active:scale-95
              transition-all duration-200 ease-out
              group-hover:opacity-100 sm:opacity-70"
          >
            <FileText className="w-3 h-3" />
            <span className="hidden sm:inline">PDF</span>
          </a>
        )}
      </div>
    </motion.div>
  );
}

function ChapterSection({
  chapter,
  subjectColor,
  onToggleTopic,
  defaultOpen,
  highlightTopicId,
  highlightRef,
}: {
  chapter: SubjectDetailChapter;
  subjectColor: string;
  onToggleTopic: (id: string) => void;
  defaultOpen: boolean;
  highlightTopicId: string | null;
  highlightRef: React.RefObject<HTMLDivElement | null>;
}) {
  // Auto-open chapter if it contains the highlighted topic
  const hasHighlighted = highlightTopicId && chapter.topics.some(t => t.id === highlightTopicId);
  const [isOpen, setIsOpen] = useState(defaultOpen || !!hasHighlighted);
  const colorHex = COLOR_HEX[subjectColor] || COLOR_HEX['Amber'];
  const colorText = COLOR_TEXT[subjectColor] || 'text-amber-500';
  const colorBg = COLOR_BG[subjectColor] || 'bg-amber-500/10';
  const isComplete = chapter.completedTopics === chapter.totalTopics && chapter.totalTopics > 0;
  const progressPct = chapter.totalTopics > 0 ? Math.round((chapter.completedTopics / chapter.totalTopics) * 100) : 0;

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors duration-200"
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-display font-bold flex-shrink-0
            ${isComplete ? colorBg : colorBg}`}
          style={isComplete ? { backgroundColor: colorHex, color: 'white' } : undefined}
        >
          {isComplete ? <Check className="w-3.5 h-3.5" /> : chapter.number}
        </div>

        <div className="flex-1 text-left min-w-0">
          <h3 className="font-display font-semibold text-sm truncate">{chapter.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-mono text-muted-foreground">
              {chapter.completedTopics}/{chapter.totalTopics} topics
            </span>
            <div className="flex-1 max-w-[60px] h-1 bg-muted/30 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: colorHex }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className={`text-[10px] font-mono font-bold ${colorText}`}>{progressPct}%</span>
          </div>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 0 : -90 }}
          transition={{ duration: 0.2 }}
          className="text-muted-foreground"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border">
              {chapter.topics.map((topic) => (
                <TopicRow
                  key={topic.id}
                  topic={topic}
                  subjectColor={subjectColor}
                  onToggle={onToggleTopic}
                  isHighlighted={highlightTopicId === topic.id}
                  highlightRef={highlightRef}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SubjectDetailView() {
  const { subjectDetail, subjectDetailLoading, closeSubjectDetail, toggleSubjectDetailTopic, student, highlightTopicId, setHighlightTopicId } = useStudyOS();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all');
  const highlightedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to highlighted topic when detail loads
  useEffect(() => {
    if (highlightTopicId && subjectDetail && !subjectDetailLoading) {
      // Small delay to allow animation to complete
      const timer = setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Clear highlight after scrolling
        setTimeout(() => setHighlightTopicId(null), 3000);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [highlightTopicId, subjectDetail, subjectDetailLoading, setHighlightTopicId]);

  if (subjectDetailLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 animate-pulse mx-auto" />
          <div className="w-40 h-4 bg-secondary rounded animate-pulse" />
          <div className="w-24 h-3 bg-secondary rounded animate-pulse mx-auto" />
        </div>
      </div>
    );
  }

  if (!subjectDetail) return null;

  const detail = subjectDetail;
  const colorHex = COLOR_HEX[detail.color] || COLOR_HEX['Amber'];
  const colorText = COLOR_TEXT[detail.color] || 'text-amber-500';
  const colorBg = COLOR_BG[detail.color] || 'bg-amber-500/10';
  const overallPct = detail.totalTopics > 0 ? Math.round((detail.completedTopics / detail.totalTopics) * 100) : 0;
  const totalVideoTopics = detail.chapters.reduce((sum, ch) => sum + ch.topics.filter(t => t.hasVideo).length, 0);
  const totalPdfTopics = detail.chapters.reduce((sum, ch) => sum + ch.topics.filter(t => t.hasPdf).length, 0);

  const filteredChapters = detail.chapters.map(ch => ({
    ...ch,
    topics: ch.topics.filter(t => {
      if (filter === 'todo') return !t.completed;
      if (filter === 'done') return t.completed;
      return true;
    }),
  })).filter(ch => ch.topics.length > 0);

  // Compute estimated total hours
  const totalHours = Math.round((detail.totalTopics * 65) / 60);

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="min-h-screen flex flex-col bg-background"
    >
      {/* Header */}
      <div className="glass-strong sticky top-0 z-50 border-b border-border" style={{ borderTop: `3px solid ${colorHex}` }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center gap-3">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={closeSubjectDetail}
              className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </motion.button>

            <div className={`w-10 h-10 rounded-xl ${colorBg} flex items-center justify-center`}>
              <span className="text-xl">{detail.icon}</span>
            </div>

            <div className="flex-1 min-w-0">
              <h1 className="font-display text-lg font-bold tracking-tight">
                {detail.name} <span className="text-muted-foreground font-normal text-sm">— ~{totalHours}h remaining</span>
              </h1>
              <p className="text-[10px] text-muted-foreground font-mono">
                {detail.grade} · {detail.board} · {detail.field}
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="font-display font-bold text-lg">
                <span className={colorText}>{overallPct}%</span>
              </p>
              <p className="text-[10px] text-muted-foreground font-mono">
                {detail.completedTopics}/{detail.totalTopics} done
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 mt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" />
              <span className="font-mono">{detail.chapterCount} chapters</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Play className="w-3.5 h-3.5" />
              <span className="font-mono">{totalVideoTopics} videos</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="w-3.5 h-3.5" />
              <span className="font-mono">{totalPdfTopics} PDFs</span>
            </div>

            <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: colorHex }}
                initial={{ width: 0 }}
                animate={{ width: `${overallPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 mt-3 bg-secondary rounded-lg p-0.5 w-fit">
            {(['all', 'todo', 'done'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-200 ${
                  filter === f
                    ? 'bg-background shadow-sm text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {f === 'all' ? `All (${detail.totalTopics})` : f === 'todo' ? `To Do (${detail.totalTopics - detail.completedTopics})` : `Done (${detail.completedTopics})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chapters List */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-5 space-y-3">
        {filteredChapters.map((chapter, index) => (
          <ChapterSection
            key={chapter.id}
            chapter={chapter}
            subjectColor={detail.color}
            onToggleTopic={toggleSubjectDetailTopic}
            defaultOpen={index === 0 || filter !== 'all'}
            highlightTopicId={highlightTopicId}
            highlightRef={highlightedRef}
          />
        ))}

        {filteredChapters.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-mono">
              {filter === 'done' ? 'No completed topics yet' : 'All topics completed!'}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-border glass">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>{detail.name} · StudyDiary</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              {totalVideoTopics} video lessons available
            </span>
          </div>
        </div>
      </footer>
    </motion.div>
  );
}
