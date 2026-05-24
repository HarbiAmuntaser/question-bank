// scripts/backfill-institution-fields.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // عدّل هذه القيم حسب بيئتك، أو ضِف شروطًا إضافية لاحقًا
  await prisma.university.updateMany({
    data: {
      countryCode: "SA",
      institutionType: "university",
    },
    // where: { countryCode: null }, // لو حاب تقصره على السجلات الفارغة فقط
  });

  console.log("Backfill done ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
