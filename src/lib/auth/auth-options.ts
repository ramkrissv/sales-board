import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectDB } from '@/lib/db/connection';
import mongoose, { Schema } from 'mongoose';

// Define User schema inline to avoid import issues in production
const UserSchema = new Schema({
  email: { type: String, unique: true, required: true },
  firstName: String,
  lastName: String,
  profileImageUrl: String,
  role: { type: String, enum: ['admin', 'manager', 'rep', 'sdr', 'presales', 'viewer'], default: 'rep' },
  team: String,
}, { timestamps: true });

function getUserModel() {
  return mongoose.models.User || mongoose.model('User', UserSchema);
}

export const authOptions: NextAuthOptions = {
  providers: [
    // Azure AD - add when AZURE_AD_CLIENT_ID is set
    ...(process.env.AZURE_AD_CLIENT_ID
      ? [
          {
            id: 'azure-ad',
            name: 'Microsoft',
            type: 'oauth' as const,
            wellKnown: `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/v2.0/.well-known/openid-configuration`,
            clientId: process.env.AZURE_AD_CLIENT_ID!,
            clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
            authorization: { params: { scope: 'openid email profile' } },
            profile(profile: any) {
              return { id: profile.sub, name: profile.name, email: profile.email, image: profile.picture };
            },
          },
        ]
      : []),
    // Credentials login (always available)
    CredentialsProvider({
      name: 'Email',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'admin@galent.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;

        // Admin login requires password
        const isAdmin = credentials.email.toLowerCase() === 'admin@galent.com';
        if (isAdmin) {
          const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@246';
          if (!credentials.password || credentials.password !== adminPassword) {
            throw new Error('Invalid admin password');
          }
        }

        try {
          await connectDB();
          const User = getUserModel();
          let user = await User.findOne({ email: credentials.email });
          if (!user) {
            user = await User.create({
              email: credentials.email,
              firstName: isAdmin ? 'Admin' : credentials.email.split('@')[0],
              lastName: '',
              role: isAdmin ? 'admin' : 'rep',
            });
          }
          return {
            id: user._id.toString(),
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
            image: user.profileImageUrl,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET || 'galent-default-secret',
};
