export type CatalogProduct = {
  id: number;
  name: string;
  price: number;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export class CatalogError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'CatalogError';
  }
}

export class CatalogUnavailableError extends Error {
  constructor(message = 'Catalog service is unavailable') {
    super(message);
    this.name = 'CatalogUnavailableError';
  }
}

function getCatalogBaseUrl(): string {
  return process.env.CATALOG_SERVICE_URL || 'http://localhost:3002';
}

export async function getProduct(productId: number): Promise<CatalogProduct> {
  const url = `${getCatalogBaseUrl()}/api/products/${productId}`;

  let response: Response;

  try {
    response = await fetch(url);
  } catch (error) {
    console.error('Catalog request failed:', error);
    throw new CatalogUnavailableError();
  }

  if (response.status === 404) {
    throw new CatalogError(404, 'Product not found');
  }

  if (!response.ok) {
    throw new CatalogError(
      response.status,
      `Catalog service returned status ${response.status}`,
    );
  }

  return (await response.json()) as CatalogProduct;
}
