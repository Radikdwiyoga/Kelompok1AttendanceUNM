const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- RESETTING & SEEDING DATABASE ---');

  // Clear all data
  await prisma.attendance.deleteMany();
  await prisma.schedule.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('P@ssw0rd123!!', 10);

  // 1. Admin Account
  await prisma.user.create({
    data: {
      email: 'admin@nusamandiri.ac.id',
      username: 'admin@nusamandiri.ac.id',
      name: 'Administrator UNM',
      password: passwordHash,
      role: 'ADMIN'
    },
  });

  // 2. Classes
  const class1 = await prisma.class.create({ data: { name: 'S1 - Teknik Informatika' } });
  const class2 = await prisma.class.create({ data: { name: 'S1 - Sistem Informasi' } });

  // 3. Schedules
  const todayDay = new Date().getDay();
  await prisma.schedule.create({
    data: {
      subjectName: 'Pemrograman Web Next.js',
      dayOfWeek: todayDay,
      startTime: '08:00',
      endTime: '23:59',
      classId: class1.id
    }
  });
  
  await prisma.schedule.create({
    data: {
      subjectName: 'Rekayasa Perangkat Lunak',
      dayOfWeek: todayDay,
      startTime: '07:30',
      endTime: '23:59',
      classId: class2.id
    }
  });

  // 4. Default Settings
  await prisma.setting.create({ data: { key: 'face_accuracy_threshold', value: '0.65' } });
  await prisma.setting.create({ data: { key: 'institution_name', value: 'UNIVERSITAS NUSA MANDIRI' } });
  await prisma.setting.create({ data: { key: 'campus_lat', value: '-6.1925608' } });
  await prisma.setting.create({ data: { key: 'campus_lng', value: '106.8805873' } });
  await prisma.setting.create({ data: { key: 'campus_radius', value: '100' } });

  console.log('--- SEED COMPLETED ---');
  console.log('Admin Login: admin@nusamandiri.ac.id / P@ssw0rd123!!');
}

main()
  .catch((e) => {
    console.error('SEED FAILED:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
