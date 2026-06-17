"use server";

import { prisma } from "../utils/prisma";
import { UserStatus } from "@prisma/client";
import { sendEmail, buildOtpEmail } from "../utils/email";

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: {
    name: string;
    email: string;
    role: string;
    status: "PENDING" | "ACTIVE";
  };
}

// ─── Generate a secure 6-digit OTP ───────────────────────────────────────────
function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── 1. Send OTP for email verification (called before signup) ────────────────
export async function sendSignupOtpAction(email: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if account already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return { success: false, error: "An account with this email already exists. Please sign in." };
    }

    // Invalidate any previous unused OTPs for this email
    await prisma.emailOtp.updateMany({
      where: { email, used: false },
      data: { used: true },
    });

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await prisma.emailOtp.create({
      data: { email, otp, expiresAt },
    });

    const html = buildOtpEmail(name, otp);
    const emailResult = await sendEmail({
      to: email,
      toName: name,
      subject: "Your ThePitchly verification code",
      htmlContent: html,
    });

    if (!emailResult.success) {
      return { success: false, error: emailResult.error || "Failed to send verification email. Please check your email address and try again." };
    }

    return { success: true };
  } catch (error) {
    console.error("Error in sendSignupOtpAction:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// ─── 2. Verify OTP + complete signup in one step ─────────────────────────────
export async function verifyOtpAndSignUpAction(data: {
  otp: string;
  name: string;
  email: string;
  password: string;
  role: string;
  skills: string;
  portfolioUrl: string;
  githubUrl: string;
  linkedinUrl: string;
}): Promise<AuthResult> {
  try {
    // Find the most recent unused, unexpired OTP for this email
    const record = await prisma.emailOtp.findFirst({
      where: {
        email: data.email,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return { success: false, error: "Verification code expired. Please request a new one." };
    }

    if (record.otp !== data.otp.trim()) {
      return { success: false, error: "Incorrect code. Please check your email and try again." };
    }

    // Mark OTP as used
    await prisma.emailOtp.update({ where: { id: record.id }, data: { used: true } });

    // Double-check account doesn't exist already
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return { success: false, error: "An account with this email already exists." };
    }

    // Create user as ACTIVE immediately (email is verified)
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role || "Developer",
        status: UserStatus.ACTIVE,
      },
    });

    // Parse skills
    const skillsArray = data.skills
      ? data.skills.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    // Provision user profile
    await prisma.userProfile.create({
      data: {
        user: {
          connect: {
            id: user.id,
          },
        },
        name: data.name,
        role: data.role || "Developer",
        email: data.email,
        skills: skillsArray,
        portfolioUrl: data.portfolioUrl || "",
        githubUrl: data.githubUrl || "",
        linkedinUrl: data.linkedinUrl || "",
        education: [] as any,
      },
    });

    return {
      success: true,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status as "PENDING" | "ACTIVE",
      },
    };
  } catch (error) {
    console.error("Error in verifyOtpAndSignUpAction:", error);
    return { success: false, error: "Account creation failed. Please try again." };
  }
}

// ─── 3. Login ────────────────────────────────────────────────────────────────
export async function loginAction(credentials: {
  email: string;
  password: string;
}): Promise<AuthResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: credentials.email },
    });

    if (!user) {
      return { success: false, error: "No account found with this email." };
    }

    if (user.password !== credentials.password) {
      return { success: false, error: "Incorrect password. Please try again." };
    }

    return {
      success: true,
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status as "PENDING" | "ACTIVE",
      },
    };
  } catch (error) {
    console.error("Error in loginAction:", error);
    return { success: false, error: "Something went wrong. Please try again." };
  }
}

// ─── 4. Check account status ─────────────────────────────────────────────────
export async function checkAccountStatusAction(email: string): Promise<{ status: "PENDING" | "ACTIVE" | null }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { status: true },
    });

    if (!user) return { status: null };
    return { status: user.status as "PENDING" | "ACTIVE" };
  } catch (error) {
    console.error("Error in checkAccountStatusAction:", error);
    return { status: null };
  }
}

// ─── Legacy exports (kept for backward compat with any remaining references) ──
export async function signUpAction(_data: {
  name: string; email: string; password: string; role: string;
  skills: string; portfolioUrl: string; githubUrl: string;
  linkedinUrl: string; directActive?: boolean;
}): Promise<AuthResult> {
  return { success: false, error: "Use the OTP verification flow." };
}

export async function simulateAccountApprovalAction(_email: string): Promise<AuthResult> {
  return { success: false, error: "No longer used." };
}
