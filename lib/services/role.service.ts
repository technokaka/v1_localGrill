import { prisma } from '@/server/db/prisma';

export async function getRoles({ tenantId, search }: { tenantId?: number, search?: string }) {
  const roles = await prisma.role.findMany({
    where: {
      ...(tenantId ? { tenantRoles: { some: { tenantId } } } : {}),
    },
    include: {
      rolePermissions: { include: { permission: true } },
      tenantRoles: { include: { tenant: true } },
      userRoles: { include: { user: true } },
    },
    orderBy: { name: 'asc' },
  });
  if (search) {
    return roles.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  }
  return roles;
}

export async function createRole({ name, tenantId, permissions }: { name: string, tenantId?: number, permissions?: string[] }) {
  return prisma.role.create({
    data: {
      name,
      tenantRoles: tenantId ? { create: [{ tenantId }] } : undefined,
      rolePermissions: permissions ? { create: permissions.map(name => ({ permission: { connect: { name } } })) } : undefined,
    },
    include: {
      rolePermissions: { include: { permission: true } },
      tenantRoles: { include: { tenant: true } },
    },
  });
}

export async function updateRole({ id, name, permissions }: { id: number, name?: string, permissions?: string[] }) {
  return prisma.role.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(permissions && { rolePermissions: { deleteMany: {}, create: permissions.map(name => ({ permission: { connect: { name } } })) } }),
    },
    include: {
      rolePermissions: { include: { permission: true } },
    },
  });
}

export async function deleteRole(id: number) {
  return prisma.role.delete({ where: { id } });
}
