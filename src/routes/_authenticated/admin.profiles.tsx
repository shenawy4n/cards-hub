import { createFileRoute } from "@tanstack/react-router";
import { adminHead } from "@/components/admin/ui";
import { ProfilesList } from "./admin.users.index";

export const Route = createFileRoute("/_authenticated/admin/profiles")({
  head: adminHead("Profiles"),
  component: () => <ProfilesList mode="profiles" />,
});
