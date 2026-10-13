import { prisma } from '@/server/db/prisma';
import bcrypt from 'bcryptjs';

export async function getUsers({ tenantId, role, search, skip = 0, take = 20 }: { tenantId?: number, role?: string, search?: string, skip?: number, take?: number }) {
  const users = await prisma.user.findMany({
    where: {
      ...(tenantId ? { tenantUsers: { some: { tenantId } } } : {}),
      ...(role ? { userRoles: { some: { role: { name: role } } } } : {}),
    },
    include: {
      userRoles: { include: { role: true } },
      tenantUsers: { include: { tenant: true } },
      userPermissions: { include: { permission: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  let filtered = users;
  if (search) {
    const s = search.toLowerCase();
    filtered = users.filter(u =>
      u.email.toLowerCase().includes(s) ||
      u.fullName.toLowerCase().includes(s)
    );
  }
  return filtered.slice(skip, skip + take);
}

export async function createUser({ email, password, fullName, status, tenantId, roles, permissions }: { email: string, password: string, fullName: string, status: string, tenantId?: number, roles?: string[], permissions?: string[] }) {
  const hash = await bcrypt.hash(password, 10);
  return prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      fullName,
      status: status as any,
      tenantUsers: tenantId ? { create: [{ tenantId }] } : undefined,
      userRoles: roles ? { create: roles.map(name => ({ role: { connect: { name } } })) } : undefined,
      userPermissions: permissions ? { create: permissions.map(name => ({ permission: { connect: { name } } })) } : undefined,
    },
    include: {
      userRoles: { include: { role: true } },
      tenantUsers: { include: { tenant: true } },
      userPermissions: { include: { permission: true } },
    },
  });
}

export async function updateUser({ id, email, fullName, status, password, roles, permissions }: { id: number, email?: string, fullName?: string, status?: string, password?: string, roles?: string[], permissions?: string[] }) {
  return prisma.user.update({
    where: { id },
    data: {
      ...(email && { email }),
      ...(fullName && { fullName }),
      ...(status && { status: status as any }),
      ...(password && { passwordHash: await bcrypt.hash(password, 10) }),
      ...(roles && { userRoles: { deleteMany: {}, create: roles.map(name => ({ role: { connect: { name } } })) } }),
      ...(permissions && { userPermissions: { deleteMany: {}, create: permissions.map(name => ({ permission: { connect: { name } } })) } }),
    },
    include: {
      userRoles: { include: { role: true } },
      userPermissions: { include: { permission: true } },
    },
  });
}

export async function deleteUser(id: number) {
  return prisma.user.delete({ where: { id } });
}

export async function toggleUserStatus(id: number) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found');
  return prisma.user.update({ where: { id }, data: { status: user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } });
}
