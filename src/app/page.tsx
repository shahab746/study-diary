'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from 'next-auth/react';
import { useStudyOS } from '@/lib/store';
import { Sidebar } from '@/components/study-os/Sidebar';
import { WelcomeCard } from '@/components/study-os/WelcomeCard';
import { StatsGrid } from '@/components/study-os/StatsGrid';
import { MissionFeed } from '@/components/study-os/MissionFeed';
import { CalendarStrip } from '@/components/study-os/CalendarStrip';
import { SubjectMatrix } from '@/components/study-os/SubjectMatrix';
import { PacingEngineCard } from '@/components/study-os/PacingEngineCard';
import { RevisionDock } from '@/components/study-os/RevisionDock';
import { SubjectDetailView } from '@/components/study-os/SubjectDetailView';
import { LoginPage } from '@/components/auth/LoginPage';
import { Home as HomeIcon, ListTodo, BookOpen, Calendar, Zap, Moon, Sun, LogOut, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { signOut } from 'next-auth/react';
import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

function MobileHeader() {
  const { student, totalCompleted, totalTopics } = useStudyOS();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const overallPct = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;

  return (
    <header className="glass sticky top-0 z-50 border-b border-border">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-sm font-bold tracking-tight leading-none">LectureDiary</h1>
              <p className="text-[9px] text-muted-foreground font-mono mt-0.5">
                {student?.name || 'Student'} · {totalCompleted} Lec
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mini progress */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallPct}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{overallPct}%</span>
            </div>
            
            {mounted && (
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Logout button */}
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function MobileBottomNav() {
  const { sidebarView, setSidebarView } = useStudyOS();
  
  const items = [
    { id: 'today' as const, icon: <HomeIcon className="w-4 h-4" />, label: 'Today' },
    { id: 'tasks' as const, icon: <ListTodo className="w-4 h-4" />, label: 'Tasks' },
    { id: 'courses' as const, icon: <BookOpen className="w-4 h-4" />, label: 'Courses' },
    { id: 'schedule' as const, icon: <Calendar className="w-4 h-4" />, label: 'Schedule' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-2">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => setSidebarView(item.id)}
            className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${
              sidebarView === item.id
                ? 'text-primary'
                : 'text-muted-foreground'
            }`}
          >
            {item.icon}
            <span className="text-[9px] font-mono">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar skeleton */}
      <div className="hidden md:flex flex-col w-56 lg:w-64 border-r border-border p-4 space-y-4">
        <div className="w-full h-10 bg-secondary/50 rounded-lg animate-pulse" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="w-full h-9 bg-secondary/30 rounded-lg animate-pulse" />
        ))}
      </div>
      {/* Main skeleton */}
      <div className="flex-1 p-4 sm:p-6 space-y-4">
        <div className="h-40 bg-secondary/30 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-secondary/30 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-secondary/30 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

function DashboardView() {
  const { sidebarView } = useStudyOS();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <MobileHeader />

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 pb-24 md:pb-5 space-y-5">
            {sidebarView === 'today' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {/* Welcome Hero */}
                <WelcomeCard />

                {/* Stats Grid */}
                <StatsGrid />

                {/* Bento Grid: Mission Feed + Pacing Engine */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {/* Mission Feed - takes 2 cols */}
                  <div className="lg:col-span-2 glass-strong rounded-2xl p-5">
                    <MissionFeed />
                  </div>
                  {/* Pacing Engine - takes 1 col */}
                  <div className="space-y-5">
                    <PacingEngineCard />
                    <CalendarStrip />
                  </div>
                </div>

              </motion.div>
            )}

            {sidebarView === 'tasks' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <div className="glass-strong rounded-2xl p-5">
                  <MissionFeed />
                </div>
              </motion.div>
            )}

            {sidebarView === 'courses' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <SubjectMatrix />
              </motion.div>
            )}

            {sidebarView === 'schedule' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                <PacingEngineCard />
                <CalendarStrip />
                <RevisionDock />
              </motion.div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-border glass">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2.5">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span>LectureDiary v1.0</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Synced · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileBottomNav />
    </div>
  );
}

function AuthLoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
          <Zap className="w-7 h-7 text-primary" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm font-mono">Loading session...</span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const { data: session, status } = useSession();
  const { fetchData, isLoading, selectedSubjectId, student } = useStudyOS();

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const sessionPhone = (session.user as Record<string, unknown>).phone as string;
      
      // Check if the session user matches the currently loaded data
      // If not, reset and reload (handles user switching)
      const currentPhone = student?.phone;
      if (currentPhone && currentPhone !== sessionPhone) {
        console.log(`🔄 User changed: ${currentPhone} → ${sessionPhone}, reloading data...`);
      }
      
      // Always fetch fresh data for the authenticated session user
      fetchData(sessionPhone);
    }
  }, [fetchData, status, session]);

  // Show loading while checking session
  if (status === 'loading') return <AuthLoadingScreen />;

  // Show login page if not authenticated
  if (status === 'unauthenticated' || !session) return <LoginPage />;

  // Show dashboard loading skeleton
  if (isLoading) return <LoadingSkeleton />;

  return (
    <AnimatePresence mode="wait">
      {selectedSubjectId ? (
        <SubjectDetailView key="subject-detail" />
      ) : (
        <DashboardView key="dashboard" />
      )}
    </AnimatePresence>
  );
}
