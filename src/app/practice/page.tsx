import { RequireAuth } from "@/components/auth/RequireAuth";
import { PatternCodex } from "@/components/practice/PatternCodex";

export default function PracticePage() {
  return <RequireAuth><main className="practice-page"><PatternCodex /></main></RequireAuth>;
}
