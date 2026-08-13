import { redirect } from "next/navigation";

/** The app has no marketing home — send everyone to the dashboard (auth-gated). */
export default function RootPage() {
  redirect("/dashboard");
}
