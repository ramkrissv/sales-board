import { NextAuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectDB } from '@/lib/db/connection';
import mongoose from 'mongoose';

// Get User model safely
function getUserModel() {
  return mongoose.models.User || require('@/lib/db/models/user').default;
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Azure AD provider - configure with tenant credentials
    ...(process.env.AZURE_AD_CLIENT_ID
      ? [
          AzureADProvider({
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            tenantId: process.env.AZURE_AD_TENANT_ID!,
            authorization: {
              params: {
                scope: 'openid email profile User.Read',
              },
            },
          }),
        ]
      : []),
    // Credentials fallback for development / standalone
    CredentialsProvider({
      name: 'Development Login',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@galent.com' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        await connectDB();
        const User = getUserModel();
        let user = await User.findOne({ email: credentials.email });
        if (!user) {
          // Auto-create user in dev mode
          user = await User.create({
            email: credentials.email,
            firstName: credentials.email.split('@')[0],
            lastName: '',
            role: 'admin',
          });
        }
        return {
          id: user._id.toString(),
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          image: user.profileImageUrl,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'azure-ad') {
        await connectDB();
        const User = getUserModel();
        // Upsert user from Azure AD
        await User.findOneAndUpdate(
          { email: user.email },
          {
            email: user.email,
            firstName: (profile as any)?.given_name || user.name?.split(' ')[0] || '',
            lastName: (profile as any)?.family_name || user.name?.split(' ').slice(1).join(' ') || '',
            profileImageUrl: user.image || null,
            // Don't overwrite role if user already exists
            $setOnInsert: { role: 'rep' },
          },
          { upsert: true, new: true }
        );
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role || 'rep';
        token.userId = user.id;
      }
      // Refresh role from DB on each token refresh
      if (token.email && !user) {
        await connectDB();
        const User = getUserModel();
        const dbUser = await User.findOne({ email: token.email });
        if (dbUser) {
          token.role = dbUser.role;
          token.userId = dbUser._id.toString();
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 1 week
  },
  secret: process.env.NEXTAUTH_SECRET,
};
