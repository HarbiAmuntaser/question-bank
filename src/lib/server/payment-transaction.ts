import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PaymentError } from "@/lib/server/payment-scope";

type PaymentTransactionOptions = { maxWait?: number; timeout?: number };

export async function paymentTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
  options: PaymentTransactionOptions = {},
): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(work, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        ...options,
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError)) throw error;
      const retryable = ["P2034", "P2002"].includes(error.code) ||
        (error.code === "P2010" && ["40001", "40P01"].includes(String(error.meta?.code)));
      if (!retryable) throw error;
    }
  }
  throw new PaymentError("payment_conflict_retry", 409);
}
