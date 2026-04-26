import { buildCategoryLink, HeaderNavItem } from './site-navigation.models';

export const SITE_CATEGORY_NAV_ITEMS: HeaderNavItem[] = [
  { label: 'Keyboards', slug: 'keyboards', link: buildCategoryLink('keyboards') },
  { label: 'Mice', slug: 'mice', link: buildCategoryLink('mice') },
  { label: 'Speakers', slug: 'speakers', link: buildCategoryLink('speakers') },
  { label: 'Earbuds', slug: 'earbuds', link: buildCategoryLink('earbuds') },
  { label: 'Chargers', slug: 'chargers', link: buildCategoryLink('chargers') },
  { label: 'Accessories', slug: 'accessories', link: buildCategoryLink('accessories') },
];
