import { Suspense } from 'react';
import { InventoryClient } from './InventoryClient';

export default function AdminInventoryPage() {
  return (
    <Suspense fallback={null}>
      <InventoryClient />
    </Suspense>
  );
}
