import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function getAllPermissions() {
  return prisma.permission.findMany({
    include: {
      rolePermissions: { include: { role: true } },
      userPermissions: { include: { user: true } },
    },
  });
}

export async function createPermission(data: any) {
  return prisma.permission.create({ data });
}

export async function assignPermissionToRole(permissionId: number, roleId: number) {
  return prisma.rolePermission.create({ data: { permissionId, roleId } });
}

export async function assignPermissionToUser(permissionId: number, userId: number) {
  return prisma.userPermission.create({ data: { permissionId, userId } });
}
