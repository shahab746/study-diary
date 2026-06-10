import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import {
  findUserByPhone,
  dbUserToSheetUser,
  isSupabaseConfigured,
} from '@/lib/supabase';
import { findRegisteredUserByPhone } from '@/lib/registered-users';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        phone: {
          label: 'Phone Number',
          type: 'text',
          placeholder: '03XXXXXXXXX',
        },
        pin: {
          label: 'PIN',
          type: 'password',
          placeholder: '••••',
        },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.pin) {
          console.warn('🔐 Auth: Missing phone or PIN');
          throw new Error('Phone number and PIN are required');
        }

        const cleanPhone = credentials.phone.trim();
        const cleanPin = credentials.pin.trim();

        console.log(`🔐 Auth: Looking up phone="${cleanPhone}"`);

        try {
          // ── Try Supabase first ──
          if (isSupabaseConfigured()) {
            const dbUser = await findUserByPhone(cleanPhone);

            if (dbUser) {
              if (dbUser.pin !== cleanPin) {
                console.warn(`🔐 Auth: Wrong PIN for phone="${cleanPhone}" (Supabase)`);
                throw new Error('Incorrect PIN');
              }

              const normalizedStatus = dbUser.status?.toLowerCase().trim();
              if (normalizedStatus === 'blocked' || normalizedStatus === 'disabled') {
                throw new Error('Your account has been disabled. Please contact support.');
              }

              console.log(`🔐 Auth: Login successful for "${dbUser.name}" (${dbUser.status}) [Supabase]`);
              return {
                id: dbUser.phone,
                name: dbUser.name,
                phone: dbUser.phone,
                grade: dbUser.grade,
                board: dbUser.board,
                field: dbUser.field,
                status: dbUser.status,
                academicGroup: dbUser.academic_group,
              };
            }
          }

          // ── Fallback: Google Sheets + registered-users cache ──
          const sheetUser = await findRegisteredUserByPhone(cleanPhone, true);

          if (!sheetUser) {
            console.warn(`🔐 Auth: No user found for phone="${cleanPhone}"`);
            throw new Error('No account found. Please register or try again.');
          }

          if (sheetUser.pin !== cleanPin) {
            console.warn(`🔐 Auth: Wrong PIN for phone="${cleanPhone}" (Sheets)`);
            throw new Error('Incorrect PIN');
          }

          const normalizedStatus = sheetUser.status?.toLowerCase().trim();
          if (normalizedStatus === 'blocked' || normalizedStatus === 'disabled') {
            throw new Error('Your account has been disabled. Please contact support.');
          }

          console.log(`🔐 Auth: Login successful for "${sheetUser.name}" (${sheetUser.status}) [Sheets fallback]`);

          // Auto-migrate to Supabase on login
          if (isSupabaseConfigured()) {
            const { getSupabase } = await import('@/lib/supabase');
            const sb = getSupabase();
            await sb.from('users').insert({
              name: sheetUser.name,
              phone: sheetUser.phone,
              pin: sheetUser.pin,
              grade: sheetUser.grade,
              board: sheetUser.board,
              field: sheetUser.field,
              status: sheetUser.status === 'true' ? 'paid' : sheetUser.status === 'false' ? 'free' : sheetUser.status,
              academic_group: sheetUser.academicGroup,
              start_date: sheetUser.startDate || new Date().toISOString().split('T')[0],
              target_date: sheetUser.targetDate,
              current_day: sheetUser.currentDay,
              total_days: sheetUser.totalDays,
              pacing_goal: sheetUser.pacingGoal,
              topics_done: sheetUser.topicsDone,
              days_left: sheetUser.daysLeft,
              topics_per_day: sheetUser.topicsPerDay,
            }).catch((err: any) => {
              if (err?.code !== '23505') {
                console.warn('⚠️ Auto-migration failed (non-critical):', err.message);
              }
            });
          }

          return {
            id: sheetUser.phone,
            name: sheetUser.name,
            phone: sheetUser.phone,
            grade: sheetUser.grade,
            board: sheetUser.board,
            field: sheetUser.field,
            status: sheetUser.status,
            academicGroup: sheetUser.academicGroup,
          };
        } catch (error) {
          // Re-throw our own error messages
          if (error instanceof Error && (
            error.message.includes('No account') ||
            error.message.includes('Incorrect PIN') ||
            error.message.includes('disabled') ||
            error.message.includes('register')
          )) {
            throw error;
          }
          // Unexpected errors
          console.error('🔐 Auth: Unexpected error during authorization:', error);
          const errMsg = error instanceof Error ? error.message : String(error);
          throw new Error(`Connection error: ${errMsg}`);
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.phone = (user as Record<string, unknown>).phone;
        token.grade = (user as Record<string, unknown>).grade;
        token.board = (user as Record<string, unknown>).board;
        token.field = (user as Record<string, unknown>).field;
        token.status = (user as Record<string, unknown>).status;
        token.academicGroup = (user as Record<string, unknown>).academicGroup;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).phone = token.phone;
        (session.user as Record<string, unknown>).grade = token.grade;
        (session.user as Record<string, unknown>).board = token.board;
        (session.user as Record<string, unknown>).field = token.field;
        (session.user as Record<string, unknown>).status = token.status;
        (session.user as Record<string, unknown>).academicGroup = token.academicGroup;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET || 'study-diary-dev-secret-fallback',
  debug: false,
};
