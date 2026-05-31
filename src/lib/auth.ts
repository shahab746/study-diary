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
          throw new Error('Phone number and PIN are required');
        }

        const student = await db.student.findFirst({
          where: {
            phone: credentials.phone,
          },
        });

        if (!student) {
          throw new Error('No account found with this phone number');
        }

        if (student.pin !== credentials.pin) {
          throw new Error('Incorrect PIN');
        }

        return {
          id: student.id,
          name: student.name,
          phone: student.phone,
          grade: student.grade,
          board: student.board,
          field: student.field,
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
        token.phone = user.phone;
        token.grade = user.grade;
        token.board = user.board;
        token.field = user.field;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).phone = token.phone;
        (session.user as Record<string, unknown>).grade = token.grade;
        (session.user as Record<string, unknown>).board = token.board;
        (session.user as Record<string, unknown>).field = token.field;
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
