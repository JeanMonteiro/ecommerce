export type CartItem = {
  id: number;
  productId: number;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  createdAt: string;
  updatedAt: string;
};

export type CartResponse = {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
};

export class CartError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'CartError';
  }
}

export class CartUnavailableError extends Error {
  constructor(message = 'Cart service is unavailable') {
    super(message);
    this.name = 'CartUnavailableError';
  }
}

function getCartBaseUrl(): string {
  return process.env.CART_SERVICE_URL || 'http://localhost:3003';
}

export async function getCart(authorizationHeader: string): Promise<CartResponse> {
  const url = `${getCartBaseUrl()}/api/cart`;

  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        Authorization: authorizationHeader,
      },
    });
  } catch (error) {
    console.error('Cart request failed:', error);
    throw new CartUnavailableError();
  }

  if (response.status === 401) {
    throw new CartError(401, 'Authentication required');
  }

  if (!response.ok) {
    throw new CartError(
      response.status,
      `Cart service returned status ${response.status}`,
    );
  }

  return (await response.json()) as CartResponse;
}
