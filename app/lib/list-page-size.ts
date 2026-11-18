/**
 * Rows per page in every paged list (ui-rules decision 2026-11-18): enough to scroll through on a phone without
 * paging all the time (Baymard: 15–30 first on phones), with pages in the URL so up returns to the same page.
 * Short lists that are small by nature (Tjenester, Grupper, Ansatte) show everything instead.
 */
export const LIST_PAGE_SIZE = 25;
