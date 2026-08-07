import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import Invite from '@/models/Invite';
import { LoginSchema } from '@/lib/validations';
import { OWNER_EMAIL } from '@/lib/rbac';
import type { UserRole } from '@/models/User';

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

/**
 * Consume a pending staff invite for `email` and return the role it grants.
 *
 * Staff invites hand out a `/register?invite=<token>` link, which only the
 * credentials flow reads. An invited person who signs in with Google instead
 * never touches that page, so before this existed their invite stayed unused
 * and they landed as a CUSTOMER — a SUPER_ADMIN invite silently did nothing.
 *
 * Matching on the verified Google email (not the token) is what makes this
 * safe: the invite was addressed to that mailbox, and Google has proven the
 * person controls it.
 */
async function redeemInviteFor(email?: string | null): Promise<UserRole | null> {
  if (!email) return null;
  const invite = await Invite.findOneAndUpdate(
    {
      email: email.toLowerCase(),
      used: false,
      expiresAt: { $gt: new Date() },
    },
    { $set: { used: true } },
    { new: false, sort: { createdAt: -1 } }
  );
  return invite ? invite.role : null;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: authSecret,
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
        if (user.isBlocked) return null;

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
          if (existing.isBlocked) return false;
          // Link Google ID if not already linked
          if (!existing.googleId) {
            existing.googleId = account.providerAccountId;
            if (user.image && !existing.image) existing.image = user.image ?? undefined;
          }
          // A staff invite may have been issued after this account already
          // existed as a customer; apply it on their next Google sign-in.
          const invitedRole = await redeemInviteFor(user.email);
          if (invitedRole) existing.role = invitedRole;
          if (existing.isModified()) await existing.save();
          user.id = existing._id.toString();
          user.role = existing.role;
        } else {
          // Create new user from Google profile
          const nameParts = (user.name ?? '').split(' ');
          const firstName = nameParts[0] || 'User';
          const lastName = nameParts.slice(1).join(' ') || '';
          const role = (await redeemInviteFor(user.email)) ?? 'CUSTOMER';
          const newUser = await User.create({
            email: user.email!,
            firstName,
            lastName,
            googleId: account.providerAccountId,
            image: user.image ?? undefined,
            role,
          });
          user.id = newUser._id.toString();
          user.role = role;
        }
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      // Owner email is always SUPER_ADMIN, regardless of stored DB role.
      if (token.email?.toLowerCase() === OWNER_EMAIL) {
        token.role = 'SUPER_ADMIN';
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id ?? '';
        session.user.role = token.role ?? 'CUSTOMER';
      }
      return session;
    },
  },
  pages: {
    signIn: '/en/login',
  },
  session: { strategy: 'jwt' },
});
