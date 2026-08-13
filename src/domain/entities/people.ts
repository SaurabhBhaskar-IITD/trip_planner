import type { Role } from "@/config/roles";
import type { AuditInfo, EntityId } from "./common";

/** Internal Trip Le employee. */
export interface User {
  id: EntityId;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastLoginAt?: Date;
  audit: AuditInfo;
}

export interface Traveller {
  fullName: string;
  age?: number;
  idType?: string;
  idNumber?: string;
}

/** The customer a quote is prepared for. */
export interface Customer {
  id: EntityId;
  name: string;
  email?: string;
  phone?: string;
  city?: string;
  travellers: Traveller[];
  notes?: string;
  audit: AuditInfo;
}
