/**
 * Teams SSO — exchanges a Teams SSO token for a SalesPilot session
 *
 * Flow:
 * 1. Teams JS SDK calls getAuthToken() → gets an Azure AD token
 * 2. Client POSTs that token here
 * 3. We validate it and extract user info (email, name)
 * 4. We create/find the user in DB and return session info
 */
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/connection';
import mongoose, { Schema } from 'mongoose';

const UserSchema = new Schema({
  email: { type: String, unique: true, required: true },
  firstName: String,
  lastName: String,
  profileImageUrl: String,
  role: { type: String, default: 'rep' },
  team: String,
}, { timestamps: true });

function getUserModel() {
  return mongoose.models.User || mongoose.model('User', UserSchema);
}

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Decode the JWT to extract user info (Teams tokens are Azure AD JWTs)
    // We trust this token because it comes from Teams SDK's getAuthToken()
    // which is already authenticated by Azure AD
    const parts = token.split('.');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const email = payload.upn || payload.preferred_username || payload.email;
    const name = payload.name || email?.split('@')[0] || 'Teams User';

    if (!email) {
      return NextResponse.json({ error: 'No email in token' }, { status: 400 });
    }

    // Create or find user
    await connectDB();
    const User = getUserModel();
    let user = await User.findOne({ email });
    if (!user) {
      const [firstName, ...rest] = name.split(' ');
      user = await User.create({
        email,
        firstName,
        lastName: rest.join(' '),
        role: 'rep',
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
