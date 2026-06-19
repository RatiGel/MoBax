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
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  module: AdminModule;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard, module: 'analytics' },
  { label: 'Products', href: '/admin/products', icon: Package, module: 'products' },
  { label: 'Reviews', href: '/admin/reviews', icon: Star, module: 'products' },
  { label: 'Categories', href: '/admin/categories', icon: FolderTree, module: 'categories' },
  { label: 'Brands', href: '/admin/brands', icon: Tag, module: 'categories' },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart, module: 'orders' },
  { label: 'Customers', href: '/admin/customers', icon: Users, module: 'customers' },
  { label: 'Pricing & Promotions', href: '/admin/pricing', icon: Tag, module: 'pricing' },
  { label: 'Theme', href: '/admin/theme', icon: Palette, module: 'theme' },
  { label: 'Content', href: '/admin/content', icon: FileText, module: 'content' },
  { label: 'Team', href: '/admin/team', icon: UserCog, module: 'team' },
  { label: 'Settings', href: '/admin/settings', icon: Settings, module: 'settings' },
];
