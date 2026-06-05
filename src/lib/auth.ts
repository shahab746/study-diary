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
          // Only check local database — no Google Sheets fallback in authorize.
          // The /api/login endpoint handles Google Sheets sync and saves to local DB
          // BEFORE this authorize function is called. So the user should always be
          // in the local DB by the time we reach here.
          const student = await db.student.findUnique({ where: { phone: cleanPhone } });

          if (!student) {
            console.warn(`🔐 Auth: No user found for phone="${cleanPhone}" in local DB`);
            throw new Error('No account found. Please try again or contact support.');
          }

          if (student.pin !== cleanPin) {
            console.warn(`🔐 Auth: Wrong PIN for phone="${cleanPhone}"`);
            throw new Error('Incorrect PIN');
          }

          if (student.status === 'blocked' || student.status === 'disabled') {
            throw new Error('Your account has been disabled. Please contact support.');
          }

          console.log(`🔐 Auth: Login successful for "${student.name}" (${student.status})`);

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
          // Unexpected errors — include the actual error message for debugging
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
  secret: process.env.NEXTAUTH_SECRET || 'lecture-diary-dev-secret-fallback',
  debug: false,
};
