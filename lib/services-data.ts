import { connectDB } from '@/lib/mongodb';
import Service from '@/models/Service';
import ServicePage from '@/models/ServicePage';
import CatalogProduct from '@/models/CatalogProduct';

export type ServiceView = {
  _id: string;
  titleEn: string;
  titleKa: string;
  descriptionEn: string;
  descriptionKa: string;
  image: string;
  order: number;
};

export type ServicePageView = {
  headingEn: string;
  headingKa: string;
  introEn: string;
  introKa: string;
  mapEmbedUrl: string;
  addressEn: string;
  addressKa: string;
};

const DEFAULT_PAGE: ServicePageView = {
  headingEn: 'Invisible protection for your beloved device',
  headingKa: 'უხილავი დაცვა თქვენი საყვარელი მოწყობილობისთვის',
  introEn: '',
  introKa: '',
  mapEmbedUrl: '',
  addressEn: '',
  addressKa: '',
};

export async function getActiveServices(): Promise<ServiceView[]> {
  await connectDB();
  const docs = await Service.find({ isActive: true }).sort({ order: 1, createdAt: 1 }).lean();
  return docs.map((d) => ({
    _id: String(d._id),
    titleEn: d.titleEn,
    titleKa: d.titleKa,
    descriptionEn: d.descriptionEn,
    descriptionKa: d.descriptionKa,
    image: d.image,
    order: d.order,
  }));
}

export async function getServicePage(): Promise<ServicePageView> {
  await connectDB();
  const doc = await ServicePage.findOne({ key: 'services' }).lean();
  if (!doc) return DEFAULT_PAGE;
  return {
    headingEn: doc.headingEn || DEFAULT_PAGE.headingEn,
    headingKa: doc.headingKa || DEFAULT_PAGE.headingKa,
    introEn: doc.introEn,
    introKa: doc.introKa,
    mapEmbedUrl: doc.mapEmbedUrl,
    addressEn: doc.addressEn,
    addressKa: doc.addressKa,
  };
}

export type CatalogProductView = {
  _id: string;
  nameEn: string;
  nameKa: string;
  descriptionEn: string;
  descriptionKa: string;
  images: string[];
  priceFrom: number;
  order: number;
};

export async function getActiveCatalogProducts(): Promise<CatalogProductView[]> {
  await connectDB();
  const docs = await CatalogProduct.find({ isActive: true })
    .sort({ order: 1, createdAt: 1 })
    .lean();
  return docs.map((d) => ({
    _id: String(d._id),
    nameEn: d.nameEn,
    nameKa: d.nameKa,
    descriptionEn: d.descriptionEn,
    descriptionKa: d.descriptionKa,
    images: d.images ?? [],
    priceFrom: d.priceFrom,
    order: d.order,
  }));
}
