import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <main className="flex min-h-svh items-center justify-center px-5 py-16">
      <AuthForm mode="signup" />
    </main>
  );
}
