import "dotenv/config";
import { hash } from "bcryptjs";
import { UserRole } from "../src/generated/prisma/enums";
import { prisma } from "../src/lib/db";
import { toReadableDatabaseError } from "../src/lib/db-errors";

async function main() {
  const email = process.env.ADMIN_SEED_EMAIL ?? "admin@bryozoo.local";
  const password = process.env.ADMIN_SEED_PASSWORD ?? "ChangeMe123!";
  const passwordHash = await hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: {
      name: "BryoZoo Admin",
      role: UserRole.ADMIN,
      isActive: true,
      passwordHash,
    },
    create: {
      email,
      name: "BryoZoo Admin",
      role: UserRole.ADMIN,
      isActive: true,
      passwordHash,
    },
  });

  console.log(`Seeded admin user: ${email}`);
}

main()
  .catch((error) => {
    console.error(toReadableDatabaseError(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
