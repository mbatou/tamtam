import { redirect } from "next/navigation";

export default function LeadsRedirect() {
  redirect("/superadmin/pipeline?tab=leads");
}
