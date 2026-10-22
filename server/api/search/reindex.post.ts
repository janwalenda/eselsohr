import { flattenPageTree, isLandingPage } from "../../../shared/collectives";
import { listCollectives, listPages } from "../../utils/nc-collectives";
import { readPageContent } from "../../utils/nc-webdav";
import { indexPageIconFromMarkdown } from "../../utils/page-icons-index";
import { indexPageTagsFromMarkdown } from "../../utils/page-tags-index";

export default defineEventHandler(async (event) => {
  const collectives = await listCollectives(event);

  let indexedPages = 0;

  for (const collective of collectives) {
    const pages = await listPages(event, collective.id);

    for (const page of flattenPageTree(pages)) {
      const content = await readPageContent(event, page);

      await indexPageTagsFromMarkdown(event, collective.id, page.id, content.content);
      await indexPageIconFromMarkdown(event, collective.id, page.id, content.content, {
        isLanding: isLandingPage(page),
      });
      indexedPages += 1;
    }
  }

  return {
    indexedPages,
    collectives: collectives.length,
  };
});
