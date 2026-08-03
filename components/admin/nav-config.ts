import type { AdminModule } from '@/lib/rbac';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  Tag,
  Palette,
  FileText,
  Settings,
  UserCog,
  Star,
  MessageSquare,
  Wrench,
  Image as ImageIcon,
  Boxes,
  type LucideIcon,
} from 'lucide-react';

/** Section a nav item belongs to — drives the grouped sidebar layout. */
export type NavGroup = 'Overview' | 'Catalog' | 'Sales' | 'Storefront' | 'Admin';

export const NAV_GROUP_ORDER: NavGroup[] = ['Overview', 'Catalog', 'Sales', 'Storefront', 'Admin'];

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module: AdminModule;
  group: NavGroup;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, module: 'analytics', group: 'Overview' },

  { label: 'Products', href: '/admin/products', icon: Package, module: 'products', group: 'Catalog' },
  { label: 'Categories', href: '/admin/categories', icon: FolderTree, module: 'categories', group: 'Catalog' },
  { label: 'Brands', href: '/admin/brands', icon: Tag, module: 'categories', group: 'Catalog' },
  { label: 'Reviews', href: '/admin/reviews', icon: Star, module: 'products', group: 'Catalog' },
  { label: 'Inventory', href: '/admin/inventory', icon: Boxes, module: 'products', group: 'Catalog' },

  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart, module: 'orders', group: 'Sales' },
  { label: 'Customers', href: '/admin/customers', icon: Users, module: 'customers', group: 'Sales' },
  { label: 'Messages', href: '/admin/messages', icon: MessageSquare, module: 'support', group: 'Sales' },
  { label: 'Pricing & Promotions', href: '/admin/pricing', icon: Tag, module: 'pricing', group: 'Sales' },

  { label: 'Theme', href: '/admin/theme', icon: Palette, module: 'theme', group: 'Storefront' },
  { label: 'Content', href: '/admin/content', icon: FileText, module: 'content', group: 'Storefront' },
  { label: 'Services', href: '/admin/services', icon: Wrench, module: 'content', group: 'Storefront' },
  { label: 'Media', href: '/admin/media', icon: ImageIcon, module: 'media', group: 'Storefront' },

  { label: 'Team', href: '/admin/team', icon: UserCog, module: 'team', group: 'Admin' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, module: 'settings', group: 'Admin' },
];
