import AuthGate from "@/components/auth/AuthGate";
import Shell from "@/components/layout/Shell";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <Shell>{children}</Shell>
    </AuthGate>
  );
}
