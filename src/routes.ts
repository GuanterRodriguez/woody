import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { DeclarationsPage } from "@/pages/DeclarationsPage";

import { ImportDocumentsPage } from "@/pages/ImportDocumentsPage";
import { CreateDossiersPage } from "@/pages/CreateDossiersPage";
import { EditDossiersPage } from "@/pages/EditDossiersPage";
import { ATraiterPage } from "@/pages/ATraiterPage";
import { AnomaliesPage } from "@/pages/AnomaliesPage";
import { GeneresPage } from "@/pages/GeneresPage";
import { CloturesPage } from "@/pages/CloturesPage";
import { EditDossierPage } from "@/pages/EditDossierPage";
import { SettingsPage } from "@/pages/SettingsPage";

const rootRoute = createRootRoute({
  component: AppLayout,
});

const declarationsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/declarations",
  component: DeclarationsPage,
});


const importDocumentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/import-documents",
  component: ImportDocumentsPage,
});

const createDossiersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/create-dossiers",
  component: CreateDossiersPage,
});

const editDossiersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/edit-dossiers",
  component: EditDossiersPage,
});

const aTraiterRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/a-traiter",
  component: ATraiterPage,
});

const anomaliesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/anomalies",
  component: AnomaliesPage,
});

const generesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/generes",
  component: GeneresPage,
});

const cloturesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/clotures",
  component: CloturesPage,
});

export const editorRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/editor/$sessionId",
  component: EditDossierPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

// Default route redirects to declarations
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DeclarationsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  declarationsRoute,

  importDocumentsRoute,
  createDossiersRoute,
  editDossiersRoute,
  aTraiterRoute,
  anomaliesRoute,
  generesRoute,
  cloturesRoute,
  editorRoute,
  settingsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
