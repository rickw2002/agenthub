import { prisma } from "../lib/prisma";

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
    });

    console.log(`\n📊 Aantal gebruikers in database: ${users.length}\n`);
    
    if (users.length === 0) {
      console.log("❌ Geen gebruikers gevonden in de database!");
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Aangemaakt: ${user.createdAt}\n`);
      });
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkUsers();

