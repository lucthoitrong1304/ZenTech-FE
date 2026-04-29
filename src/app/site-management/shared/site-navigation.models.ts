export interface HeaderNavItem {
  id?: string;
  label: string;
  slug: string;
  link: string;
  children?: HeaderNavItem[];
}

export function buildCategoryLink(slug: string): string {
  return `/categories/${slug}`;
}
