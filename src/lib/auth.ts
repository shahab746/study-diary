import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@/lib/db';

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
          // Step 1: Check local database first (fast — no network calls)
          const student = await db.student.findUnique({ where: { phone: cleanPhone } });

          if (student) {
            // Found in local DB - verify PIN
            if (student.pin !== cleanPin) {
              console.warn(`🔐 Auth: Wrong PIN for phone="${cleanPhone}" (local DB)`);
              throw new Error('Incorrect PIN');
            }

            if (student.status === 'blocked' || student.status === 'disabled') {
              throw new Error('Your account has been disabled. Please contact support.');
            }

            console.log(`🔐 Auth: Login successful for "${student.name}" via local DB (${student.status})`);

            return {
              id: student.phone,
              name: student.name,
              phone: student.phone,
              grade: student.grade,
              board: student.board,
              field: student.field,
              status: student.status,
              academicGroup: student.academicGroup,
            };
          }

          // Step 2: Not in local DB — try Google Sheet as fallback
          // This handles new users who were just added to the sheet
          console.log(`🔐 Auth: Not in local DB, trying Google Sheet...`);
          const { findUserByPhone } = await import('@/lib/sheet-sync');
          const sheetUser = await findUserByPhone(cleanPhone, true);

          if (!sheetUser) {
            console.warn(`🔐 Auth: No user found for phone="${cleanPhone}" in local DB or Google Sheet`);
            throw new Error('No account found with this phone number. Make sure your phone number is in the sheet.');
          }

          if (sheetUser.pin !== cleanPin) {
            console.warn(`🔐 Auth: Wrong PIN for phone="${cleanPhone}" (sheet)`);
            throw new Error('Incorrect PIN');
          }

          if (sheetUser.status === 'blocked' || sheetUser.status === 'disabled') {
            throw new Error('Your account has been disabled. Please contact support.');
          }

          console.log(`🔐 Auth: Login successful for "${sheetUser.name}" via Google Sheet (${sheetUser.status})`);

          // Save to local DB for future fast lookups
          try {
            await db.student.upsert({
              where: { phone: sheetUser.phone },
              create: {
                name: sheetUser.name,
                phone: sheetUser.phone,
                grade: sheetUser.grade,
                board: sheetUser.board,
                field: sheetUser.field,
                status: sheetUser.status,
                startDate: sheetUser.startDate ? new Date(sheetUser.startDate) : new Date(),
                targetDate: sheetUser.targetDate ? new Date(sheetUser.targetDate) : new Date(),
                currentDay: sheetUser.currentDay,
                totalDays: sheetUser.totalDays,
                topicsDone: sheetUser.topicsDone,
                daysLeft: sheetUser.daysLeft,
                pin: sheetUser.pin,
                academicGroup: sheetUser.academicGroup,
              },
              update: {
                name: sheetUser.name,
                grade: sheetUser.grade,
                board: sheetUser.board,
                field: sheetUser.field,
                status: sheetUser.status,
                currentDay: sheetUser.currentDay,
                totalDays: sheetUser.totalDays,
                topicsDone: sheetUser.topicsDone,
                daysLeft: sheetUser.daysLeft,
                pin: sheetUser.pin,
                academicGroup: sheetUser.academicGroup,
              },
            });
            console.log(`🔐 Auth: Saved user "${sheetUser.name}" to local DB`);
          } catch (dbError) {
            console.warn('🔐 Auth: Failed to save to local DB (non-fatal):', dbError);
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
          if (error instanceof Error && error.message.includes('No account')) {
            throw error;
          }
          if (error instanceof Error && error.message.includes('Incorrect PIN')) {
            throw error;
          }
          if (error instanceof Error && error.message.includes('disabled')) {
            throw error;
          }
          // Unexpected errors
          console.error('🔐 Auth: Unexpected error during authorization:', error);
          throw new Error('Unable to connect. Please try again in a moment.');
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
  secret: process.env.NEXTAUTH_SECRET,
  debug: false,
};
