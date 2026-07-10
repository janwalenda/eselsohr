import type { CollectivePageNode } from "~~/shared/collectives";
import { flattenPageTree } from "./useCollectivePages";
import { isLandingPage } from "~~/shared/collectives";

function findLandingPage(nodes: CollectivePageNode[]): CollectivePageNode | null {
  for (const page of flattenPageTree(nodes)) {
    if (isLandingPage(page)) {
      return page;
    }
  }

  return null;
}

export async function navigateToCollective(
  collectiveId: number,
  options: { replace?: boolean } = {},
) {
  const apiFetch = useApiFetch();

  const navigationOptions = options.replace ? { replace: true as const } : undefined;

  try {
    const response = await apiFetch<{ pages: CollectivePageNode[] }>(
      `/api/collectives/${collectiveId}/pages`,
    );

    const landingPage = findLandingPage(response.pages);

    const firstPage = landingPage ?? flattenPageTree(response.pages)[0];

    if (firstPage) {
      return navigateTo(`/app/${collectiveId}/${firstPage.id}`, navigationOptions);
    }
  } catch {
    // Fall through to collective index (empty state / error UI).
  }

  return navigateTo(`/app/${collectiveId}`, navigationOptions);
}
