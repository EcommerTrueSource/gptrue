import { registerAs } from '@nestjs/config';

export default registerAs('clerk', () => ({
  secretKey: process.env.CLERK_SECRET_KEY,
  publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  webhookSecret: process.env.CLERK_WEBHOOK_SECRET,
  jwtKey: process.env.CLERK_JWT_KEY,
  frontendApi: process.env.NEXT_PUBLIC_CLERK_FRONTEND_API,
  afterSignInUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || '/',
  afterSignUpUrl: process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL || '/',
}));
