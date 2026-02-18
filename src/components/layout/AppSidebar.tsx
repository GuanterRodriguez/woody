import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  FileUp,
  Settings,
  FolderPlus,
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Archive,

} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { useNavigationStore, type NavigationBadges } from "@/stores/navigation.store";

interface NavItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: keyof NavigationBadges;
}

const NAV_ITEMS: NavItem[] = [
  {
    title: "Déclarations non traitées",
    path: "/declarations",
    icon: AlertCircle,
    badgeKey: "declarationsNonTraitees",
  },

  {
    title: "Importer des documents",
    path: "/import-documents",
    icon: FileUp,
    badgeKey: "importDocuments",
  },
  {
    title: "Créer des dossiers",
    path: "/create-dossiers",
    icon: FolderPlus,
    badgeKey: "createDossiers",
  },
  {
    title: "À traiter",
    path: "/a-traiter",
    icon: CheckCircle2,
    badgeKey: "dashboardATraiter",
  },
  {
    title: "Générés",
    path: "/generes",
    icon: FileCheck,
    badgeKey: "dashboardGenere",
  },
  {
    title: "Clôturés",
    path: "/clotures",
    icon: Archive,
    badgeKey: "dashboardCloture",
  },
  {
    title: "Configuration",
    path: "/settings",
    icon: Settings,
  },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const { badges, loadBadges } = useNavigationStore();

  useEffect(() => {
    void loadBadges();
  }, [loadBadges]);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-4 py-2">
          <span className="text-lg font-bold">Woody</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => {
                const badge = item.badgeKey ? badges[item.badgeKey] : null;
                const isActive =
                  currentPath === item.path ||
                  (item.path === "/edit-dossiers" &&
                    currentPath.startsWith("/editor"));
                return (
                  <SidebarMenuItem key={item.path + item.title}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => void navigate({ to: item.path })}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                      {badge && badge.total > 0 && (
                        <Badge
                          variant={badge.variant ?? "secondary"}
                          className="ml-auto h-5 px-1.5 text-xs"
                        >
                          {badge.total}
                        </Badge>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="px-4 py-2 text-xs text-muted-foreground">
          Woody v0.1.0
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
