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

        console.log(`🔐 Auth: Looking up phone="${cleanPhone}" in local DB`);

        try {
          // Use local database for fast lookup (no Google Sheets API call needed)
          // The /api/login endpoint already syncs from Google Sheets
          const student = await db.student.findUnique({ where: { phone: cleanPhone } });

          if (!student) {
            console.warn(`🔐 Auth: No user found for phone="${cleanPhone}" in local DB`);
            throw new Error('No account found with this phone number. Make sure your phone number is in the sheet.');
          }

          console.log(`🔐 Auth: Found user "${student.name}" (phone: ${student.phone}, status: ${student.status})`);

          if (student.pin !== cleanPin) {
            console.warn(`🔐 Auth: PIN mismatch for "${cleanPhone}"`);
            throw new Error('Incorrect PIN');
          }

          // Check if account is active
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
          // Unexpected errors
          console.error('🔐 Auth: Unexpected error during authorization:', error);
          throw new Error('Unable to connect to the database. Please try again in a moment.');
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
