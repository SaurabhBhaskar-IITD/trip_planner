import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { CustomerDTO } from "@/types/planner";
import type { CustomerInput, CustomerRepository } from "../ports/customer.repository";

function toDTO(row: {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}): CustomerDTO {
  return { id: row.id, name: row.name, phone: row.phone, email: row.email };
}

export class PrismaCustomerRepository implements CustomerRepository {
  async search(q: string, limit = 10): Promise<CustomerDTO[]> {
    const where: Prisma.CustomerWhereInput = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        }
      : {};
    const rows = await prisma.customer.findMany({
      where,
      select: { id: true, name: true, phone: true, email: true },
      orderBy: { updatedAt: "desc" },
      take: Math.min(limit, 25),
    });
    return rows.map(toDTO);
  }

  async findById(id: string): Promise<CustomerDTO | null> {
    const row = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, name: true, phone: true, email: true },
    });
    return row ? toDTO(row) : null;
  }

  async findByPhone(phone: string): Promise<CustomerDTO | null> {
    const row = await prisma.customer.findFirst({
      where: { phone },
      select: { id: true, name: true, phone: true, email: true },
      orderBy: { createdAt: "asc" },
    });
    return row ? toDTO(row) : null;
  }

  async create(input: CustomerInput): Promise<CustomerDTO> {
    const row = await prisma.customer.create({
      data: {
        name: input.name,
        phone: input.phone || null,
        email: input.email || null,
      },
      select: { id: true, name: true, phone: true, email: true },
    });
    return toDTO(row);
  }
}

export const customerRepository: CustomerRepository = new PrismaCustomerRepository();
