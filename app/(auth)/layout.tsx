import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PropAI — Sign In",
  description: "Sign in or create your PropAI account.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
