import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// Configure your email service here
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // TODO: Save subscription to database (Supabase)
    // const { data, error } = await supabase
    //   .from('subscriptions')
    //   .insert([{ email, created_at: new Date() }]);

    // Send confirmation email to contact@weavrn.com
    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: 'contact@weavrn.com',
      subject: `New Subscription: ${email}`,
      html: `
        <h2>New Weavrn Subscription</h2>
        <p>A new user has subscribed to the Weavrn newsletter:</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Date:</strong> ${new Date().toISOString()}</p>
      `,
    });

    // Optionally send confirmation to subscriber
    await transporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL,
      to: email,
      subject: 'Welcome to Weavrn!',
      html: `
        <h2>Thank you for subscribing!</h2>
        <p>Welcome to the Weavrn community. We'll keep you updated on the latest developments.</p>
      `,
    });

    return NextResponse.json(
      { message: 'Subscription successful' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Subscription error:', error);
    return NextResponse.json(
      { error: 'Subscription failed' },
      { status: 500 }
    );
  }
}
