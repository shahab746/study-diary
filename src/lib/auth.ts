import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { findUserByPhone } from '@/lib/sheet-sync';

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
          throw new Error('Phone number and PIN are required');
        }

        // LIVE SHEET LOOKUP: Always fetches the latest user data from Google Sheets
        // If you add a user to the sheet, they can log in immediately
        const sheetUser = await findUserByPhone(credentials.phone, true);

        if (!sheetUser) {
          throw new Error('No account found with this phone number');
        }

        if (sheetUser.pin !== credentials.pin) {
          throw new Error('Incorrect PIN');
        }

        // Check if account is active (paid or free users can both log in,
        // but free users will have restricted access in the dashboard)
        if (sheetUser.status === 'blocked' || sheetUser.status === 'disabled') {
          throw new Error('Your account has been disabled. Please contact support.');
        }

        return {
          id: sheetUser.phone, // Use phone as unique ID
          name: sheetUser.name,
          phone: sheetUser.phone,
          grade: sheetUser.grade,
          board: sheetUser.board,
          field: sheetUser.field,
          status: sheetUser.status, // 'paid' | 'free' | 'blocked'
        };
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
