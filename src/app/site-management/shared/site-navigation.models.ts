export interface HeaderNavItem {
  label: string;
  slug: string;
  link: string;
}

export function buildCategoryLink(slug: string): string {
  return `/categories/${slug}`;
}
