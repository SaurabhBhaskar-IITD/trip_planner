import type { CustomerDTO } from "@/types/planner";

export interface CustomerInput {
  name: string;
  phone?: string | null;
  email?: string | null;
}

/**
 * Customer repository PORT. The planner searches existing customers to avoid
 * duplicates (§32) and creates one only when no match is found.
 */
export interface CustomerRepository {
  search(q: string, limit?: number): Promise<CustomerDTO[]>;
  findById(id: string): Promise<CustomerDTO | null>;
  findByPhone(phone: string): Promise<CustomerDTO | null>;
  create(input: CustomerInput): Promise<CustomerDTO>;
}
