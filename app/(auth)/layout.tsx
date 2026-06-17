import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ThePitchly — Sign In",
  description: "Sign in or create your ThePitchly account.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
