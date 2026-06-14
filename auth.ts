import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { LoginSchema } from '@/lib/validations';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        await connectDB();
        const user = await User.findOne({ email: parsed.data.email });
        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user._id.toString(),
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === 'google') {
        await connectDB();
        const existing = await User.findOne({ email: user.email });
        if (existing) {
          // Link Google ID if not already linked
          if (!existing.googleId) {
            existing.googleId = account.providerAccountId;
            if (user.image && !existing.image) existing.image = user.image ?? undefined;
            await existing.save();
          }
          user.id = existing._id.toString();
          (user as { role?: string }).role = existing.role;
        } else {
          // Create new user from Google profile
          const nameParts = (user.name ?? '').split(' ');
          const firstName = nameParts[0] || 'User';
          const lastName = nameParts.slice(1).join(' ') || '';
          const newUser = await User.create({
            email: user.email!,
            firstName,
            lastName,
            googleId: account.providerAccountId,
            image: user.image ?? undefined,
            role: 'CUSTOMER',
          });
          user.id = newUser._id.toString();
          (user as { role?: string }).role = 'CUSTOMER';
        }
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/en/login',
  },
  session: { strategy: 'jwt' },
});
