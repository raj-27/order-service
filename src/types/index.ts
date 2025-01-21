import { Request } from "express";

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
