/**
 * TOTP 2FA API — setup and verify authenticator app codes
 */
import { NextRequest, NextResponse } from 'next/server';
import * as otplib from 'otplib';
import * as QRCode from 'qrcode';
import { connectDB } from '@/lib/db/connection';
import mongoose, { Schema } from 'mongoose';

const TOTPSchema = new Schema({
  userId: { type: String, unique: true, required: true },
  email: { type: String, required: true },
  secret: { type: String, required: true },
  enabled: { type: Boolean, default: false },
  verifiedAt: Date,
}, { timestamps: true });

function getTOTPModel() {
  return mongoose.models.TOTPSecret || mongoose.model('TOTPSecret', TOTPSchema);
}

function generateSecret(): string {
  return otplib.generateSecret();
}

async function verifyToken(token: string, secret: string): Promise<boolean> {
  const result = await otplib.verify({ token, secret });
  return (result as any)?.valid === true;
}

function generateOtpAuthUri(email: string, secret: string): string {
  return otplib.generateURI({ issuer: 'Galent SalesPilot', label: email, secret });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, email, userId, token } = body;

  await connectDB();
  const TOTPModel = getTOTPModel();

  switch (action) {
    case 'setup': {
      if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
      const existing = await TOTPModel.findOne({ email });
      if (existing?.enabled) return NextResponse.json({ alreadyEnabled: true });

      const secret = generateSecret();
      await TOTPModel.findOneAndUpdate(
        { email },
        { email, userId: userId || email, secret, enabled: false },
        { upsert: true, new: true }
      );

      const otpauthUri = generateOtpAuthUri(email, secret);
      const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);

      return NextResponse.json({ qrCode: qrCodeDataUrl, secret, message: 'Scan QR code then verify' });
    }

    case 'verify': {
      if (!email || !token) return NextResponse.json({ error: 'Email and token required' }, { status: 400 });
      const record = await TOTPModel.findOne({ email });
      if (!record) return NextResponse.json({ error: 'No 2FA setup found' }, { status: 404 });

      const isValid = await verifyToken(token, record.secret);
      if (!isValid) return NextResponse.json({ valid: false, error: 'Invalid code' });

      record.enabled = true;
      record.verifiedAt = new Date();
      await record.save();
      return NextResponse.json({ valid: true, enabled: true });
    }

    case 'check': {
      if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
      const record = await TOTPModel.findOne({ email });
      return NextResponse.json({ hasTotp: !!record?.enabled, setupPending: !!record && !record.enabled });
    }

    case 'validate': {
      if (!email || !token) return NextResponse.json({ error: 'Email and token required' }, { status: 400 });
      const record = await TOTPModel.findOne({ email, enabled: true });
      if (!record) return NextResponse.json({ valid: true, required: false });

      const isValid = await verifyToken(token, record.secret);
      return NextResponse.json({ valid: isValid, required: true });
    }

    case 'disable': {
      if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
      await TOTPModel.findOneAndDelete({ email });
      return NextResponse.json({ disabled: true });
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }
}
