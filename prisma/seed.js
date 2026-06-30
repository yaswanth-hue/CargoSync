const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Seeding CargoSync...')

  const admin = await prisma.user.upsert({
    where: { email: 'admin@cargosync.com' },
    update: {},
    create: { email: 'admin@cargosync.com', name: 'Admin User', role: 'ADMIN' },
  })

  const coordinator = await prisma.user.upsert({
    where: { email: 'coordinator@cargosync.com' },
    update: {},
    create: { email: 'coordinator@cargosync.com', name: 'Ravi Kumar', role: 'COORDINATOR' },
  })

  const deptUser = await prisma.user.upsert({
    where: { email: 'dept@cargosync.com' },
    update: {},
    create: { email: 'dept@cargosync.com', name: 'Priya Sharma', role: 'DEPT_USER', department: 'Manufacturing' },
  })

  await prisma.user.upsert({
    where: { email: 'driver@cargosync.com' },
    update: {},
    create: { email: 'driver@cargosync.com', name: 'Suresh Reddy', role: 'DRIVER' },
  })

  const vehicles = await Promise.all([
    prisma.vehicle.upsert({
      where: { plate: 'TS09AB1234' },
      update: {},
      create: { name: 'Tata Ace', plate: 'TS09AB1234', capacity_kg: 1000, status: 'AVAILABLE' },
    }),
    prisma.vehicle.upsert({
      where: { plate: 'TS09CD5678' },
      update: {},
      create: { name: 'Ashok Leyland', plate: 'TS09CD5678', capacity_kg: 5000, status: 'AVAILABLE' },
    }),
    prisma.vehicle.upsert({
      where: { plate: 'TS09EF9012' },
      update: {},
      create: { name: 'Mahindra Bolero', plate: 'TS09EF9012', capacity_kg: 800, status: 'IN_USE' },
    }),
  ])

  const now = new Date()

  const req1 = await prisma.request.create({
    data: {
      title: 'Raw material delivery - Steel rods',
      description: '50 bundles of 12mm steel rods',
      destination: 'Warehouse A, Kompally',
      weight_kg: 800,
      priority: 'HIGH',
      required_at: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      status: 'APPROVED',
      user_id: deptUser.id,
    },
  })

  const req2 = await prisma.request.create({
    data: {
      title: 'Spare parts - Hydraulic fittings',
      destination: 'Warehouse A, Kompally',
      weight_kg: 120,
      priority: 'HIGH',
      required_at: new Date(now.getTime() + 2.5 * 60 * 60 * 1000),
      status: 'APPROVED',
      user_id: deptUser.id,
    },
  })

  await prisma.request.create({
    data: {
      title: 'Office supplies delivery',
      destination: 'Head Office, Secunderabad',
      weight_kg: 30,
      priority: 'LOW',
      required_at: new Date(now.getTime() + 6 * 60 * 60 * 1000),
      status: 'PENDING',
      user_id: deptUser.id,
    },
  })

  await prisma.request.create({
    data: {
      title: 'Chemical drums - Paint solvent',
      destination: 'Warehouse B, Patancheru',
      weight_kg: 600,
      priority: 'MEDIUM',
      required_at: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      status: 'PENDING',
      user_id: deptUser.id,
    },
  })

  const trip = await prisma.trip.create({
    data: {
      destination: 'Warehouse A, Kompally',
      status: 'IN_PROGRESS',
      scheduled_at: new Date(now.getTime() + 2 * 60 * 60 * 1000),
      vehicle_id: vehicles[0].id,
      waypoints: {
        create: [
          { label: 'Pickup - Supplier Hub, JNTU', order: 1 },
          { label: 'Drop - Warehouse A, Kompally', order: 2 },
        ],
      },
    },
  })

  await prisma.request.update({ where: { id: req1.id }, data: { trip_id: trip.id, status: 'CONSOLIDATED' } })
  await prisma.request.update({ where: { id: req2.id }, data: { trip_id: trip.id, status: 'CONSOLIDATED' } })

  console.log('Done! Users seeded:')
  console.log('  admin@cargosync.com       -> ADMIN')
  console.log('  coordinator@cargosync.com -> COORDINATOR')
  console.log('  dept@cargosync.com        -> DEPT_USER')
  console.log('  driver@cargosync.com      -> DRIVER')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())