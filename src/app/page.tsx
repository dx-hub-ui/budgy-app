import { redirect } from "next/navigation";

import { mesAtual } from "@/domain/budgeting";

export default function RootPage() {
  redirect(`/budgets/${mesAtual()}`);
}
