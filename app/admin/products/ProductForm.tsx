'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { ImageUploader } from '@/components/admin/ImageUploader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/admin-fetch';
import { toast } from 'sonner';
import type { AdminProduct } from './ProductsClient';

export interface ProductFormValues {
  nameEn: string;
  nameKa: string;
  descriptionEn: string;
  descriptionKa: string;
  slug: string;
  sku: string;
  brand: string;
  categorySlug: string;
  price: string;
  originalPrice: string;
  stock: string;
  tags: string;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  isNewProduct: boolean;
}

type FullProduct = AdminProduct & {
  descriptionEn?: string;
  descriptionKa?: string;
  originalPrice?: number;
  tags?: string[];
  isNewProduct?: boolean;
};

const EMPTY: ProductFormValues = {
  nameEn: '',
  nameKa: '',
  descriptionEn: '',
  descriptionKa: '',
  slug: '',
  sku: '',
  brand: '',
  categorySlug: '',
  price: '',
  originalPrice: '',
  stock: '0',
  tags: '',
  images: [],
  isActive: true,
  isFeatured: false,
  isNewProduct: false,
};

function fromProduct(p: FullProduct): ProductFormValues {
  return {
    nameEn: p.nameEn ?? '',
    nameKa: p.nameKa ?? '',
    descriptionEn: p.descriptionEn ?? '',
    descriptionKa: p.descriptionKa ?? '',
    slug: p.slug ?? '',
    sku: p.sku ?? '',
    brand: p.brand ?? '',
    categorySlug: p.categorySlug ?? '',
    price: p.price != null ? String(p.price) : '',
    originalPrice: p.originalPrice != null ? String(p.originalPrice) : '',
    stock: p.stock != null ? String(p.stock) : '0',
    tags: (p.tags ?? []).join(', '),
    images: p.images ?? [],
    isActive: p.isActive ?? true,
    isFeatured: p.isFeatured ?? false,
    isNewProduct: p.isNewProduct ?? false,
  };
}

export function ProductForm({ id }: { id?: string }) {
  const router = useRouter();
  const isEdit = !!id;

  const [values, setValues] = useState<ProductFormValues>(EMPTY);
  const [categories, setCategories] = useState<{ slug: string; nameEn: string }[]>([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ProductFormValues>(key: K, val: ProductFormValues[K]) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    apiFetch<FullProduct>(`/api/admin/products/${id}`)
      .then((p) => setValues(fromProduct(p)))
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Failed to load product'))
      .finally(() => setLoading(false));
  }, [id]);

  function buildPayload() {
    const payload: Record<string, unknown> = {
      nameEn: values.nameEn.trim(),
      nameKa: values.nameKa.trim(),
      descriptionEn: values.descriptionEn,
      descriptionKa: values.descriptionKa,
      sku: values.sku.trim(),
      brand: values.brand.trim(),
      categorySlug: values.categorySlug,
      price: Number(values.price),
      stock: Number(values.stock || 0),
      tags: values.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      images: values.images,
      isActive: values.isActive,
      isFeatured: values.isFeatured,
      isNewProduct: values.isNewProduct,
    };
    if (values.slug.trim()) payload.slug = values.slug.trim();
    if (values.originalPrice.trim()) payload.originalPrice = Number(values.originalPrice);
    return payload;
  }

  function validate(): string | null {
    if (!values.nameEn.trim()) return 'English name is required';
    if (!values.nameKa.trim()) return 'Georgian name is required';
    if (!values.sku.trim()) return 'SKU is required';
    if (!values.brand.trim()) return 'Brand is required';
    if (!values.categorySlug) return 'Category is required';
    if (values.price === '' || Number.isNaN(Number(values.price))) return 'Valid price is required';
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.error(err);
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await apiFetch(`/api/admin/products/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(buildPayload()),
        });
        toast.success('Product updated');
      } else {
        await apiFetch('/api/admin/products', {
          method: 'POST',
          body: JSON.stringify(buildPayload()),
        });
        toast.success('Product created');
      }
      router.push('/admin/products');
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save product');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-neutral-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <PageHeader
        title={isEdit ? 'Edit product' : 'New product'}
        description={isEdit ? values.nameEn : 'Add a product to your catalog'}
      >
        <Button asChild variant="outline" type="button">
          <a href="/admin/products">
            <ArrowLeft className="h-4 w-4" /> Back
          </a>
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isEdit ? 'Save changes' : 'Create product'}
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Name (EN)" required>
                  <Input value={values.nameEn} onChange={(e) => set('nameEn', e.target.value)} />
                </Field>
                <Field label="Name (KA)" required>
                  <Input value={values.nameKa} onChange={(e) => set('nameKa', e.target.value)} />
                </Field>
              </div>
              <Field label="Description (EN)">
                <Textarea
                  rows={4}
                  value={values.descriptionEn}
                  onChange={(e) => set('descriptionEn', e.target.value)}
                />
              </Field>
              <Field label="Description (KA)">
                <Textarea
                  rows={4}
                  value={values.descriptionKa}
                  onChange={(e) => set('descriptionKa', e.target.value)}
                />
              </Field>
              <Field
                label="Slug"
                hint={isEdit ? undefined : 'Optional — auto-generated from English name'}
              >
                <Input
                  value={values.slug}
                  onChange={(e) => set('slug', e.target.value)}
                  placeholder="auto"
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Images</CardTitle>
            </CardHeader>
            <CardContent>
              <ImageUploader
                value={values.images}
                onChange={(imgs) => set('images', imgs)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing & stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="Price (GEL)" required>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.price}
                  onChange={(e) => set('price', e.target.value)}
                />
              </Field>
              <Field label="Original price (GEL)" hint="For showing a discount">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.originalPrice}
                  onChange={(e) => set('originalPrice', e.target.value)}
                />
              </Field>
              <Field label="Stock" required>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={values.stock}
                  onChange={(e) => set('stock', e.target.value)}
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="SKU" required>
                <Input value={values.sku} onChange={(e) => set('sku', e.target.value)} />
              </Field>
              <Field label="Brand" required>
                <Input value={values.brand} onChange={(e) => set('brand', e.target.value)} />
              </Field>
              <Field label="Category" required>
                <Select
                  value={values.categorySlug}
                  onValueChange={(v) => set('categorySlug', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.slug} value={c.slug}>
                        {c.nameEn}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tags" hint="Comma-separated">
                <Input
                  value={values.tags}
                  onChange={(e) => set('tags', e.target.value)}
                  placeholder="case, wireless, fast-charge"
                />
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Toggle
                label="Active"
                hint="Visible on storefront"
                checked={values.isActive}
                onChange={(v) => set('isActive', v)}
              />
              <Toggle
                label="Featured"
                hint="Show on home page"
                checked={values.isFeatured}
                onChange={(v) => set('isFeatured', v)}
              />
              <Toggle
                label="New"
                hint="Show “New” badge"
                checked={values.isNewProduct}
                onChange={(v) => set('isNewProduct', v)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1">
        {label}
        {required && <span className="text-error">*</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-neutral-500">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <Label>{label}</Label>
        {hint && <p className="text-xs text-neutral-500">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
