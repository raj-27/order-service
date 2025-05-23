import { Request } from "express";
import mongoose, { Schema } from "mongoose";

export type AuthCookie = {
  accessToken: string;
};

export interface AuthRequest extends Request {
  auth: {
    id?: string;
    sub: string; // Subject or user ID
    role: string; // Role of the user
    tenant: number; // Tenant ID
    firstName: string; // User's first name
    lastName: string; // User's last name
    email: string; // User's email address
    iat: number; // Issued at (timestamp in seconds)
    exp: number; // Expiration time (timestamp in seconds)
    iss: string; // Issuer of the token
  };
}

export interface PriceConfiguration {
  priceType: "base" | "aditional";
  availabelOptions: {
    [key: string]: number;
  };
}

export interface ProductPricingCache {
  productId: string;
  priceConfiguration: PriceConfiguration;
}

export interface ProductMessage {
  id: string;
  priceConfiguration: PriceConfiguration;
}

export interface ToppingPriceCache {
  _id: mongoose.Types.ObjectId;
  toppingId: string;
  price: number;
  tenantId: string;
}

export interface ProductPriceConfiguration {
  [key: string]: {
    priceType: "base" | "aditional";
    availableOptions: {
      [key: string]: number;
    };
  };
}

export type Product = {
  _id: string;
  name: string;
  image: string;
  description: string;
  priceConfiguration: ProductPriceConfiguration;
};

export type Topping = {
  _id: Schema.Types.ObjectId | string;
  name: string;
  price: string;
  image: string;
};

export interface CartItem
  extends Pick<Product, "_id" | "name" | "image" | "priceConfiguration"> {
  chosenConfiguration: {
    priceConfiguration: {
      [key: string]: string;
    };
    selectedToppings: Topping[];
  };
  qty: number;
}

export interface OrderFilter {
  tenantId?: string;
}

export interface PageinateQuery {
  page: number;
  limit: number;
}
