export const ROLES = {
  ADMIN: 'ADMIN',
  COORDINATOR: 'COORDINATOR',
  DEPT_USER: 'DEPT_USER',
  DRIVER: 'DRIVER',
}

export function canApproveRequests(role) {
  return [ROLES.ADMIN, ROLES.COORDINATOR].includes(role)
}

export function canManageVehicles(role) {
  return [ROLES.ADMIN].includes(role)
}

export function canViewDashboard(role) {
  return [ROLES.ADMIN, ROLES.COORDINATOR, ROLES.DEPT_USER].includes(role)
}

export function isDriver(role) {
  return role === ROLES.DRIVER
}