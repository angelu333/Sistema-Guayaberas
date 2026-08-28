// ================================================================
// frontend/src/services/users.service.ts — Guayabera Manager
// Servicio para gestionar usuarios y empleados por sucursal
// ================================================================
import { UserProfile, UserRole } from "@/types/domain.types";

export interface CreateUserDTO {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  locationId?: string | null;
}

export interface UpdateUserDTO {
  userId: string;
  fullName?: string;
  role?: UserRole;
  locationId?: string | null;
  isActive?: boolean;
  password?: string;
}

export const usersService = {
  /**
   * Obtiene la lista de usuarios del tenant
   */
  async getUsers(): Promise<UserProfile[]> {
    const res = await fetch("/api/admin/users", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Error al obtener usuarios.");
    }

    return data.users || [];
  },

  /**
   * Registra un nuevo usuario con rol y sucursal
   */
  async createUser(dto: CreateUserDTO): Promise<UserProfile> {
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Error al crear el usuario.");
    }

    return data.user;
  },

  /**
   * Actualiza rol, sucursal, datos o contraseña de un usuario
   */
  async updateUser(dto: UpdateUserDTO): Promise<void> {
    const res = await fetch("/api/admin/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dto),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Error al actualizar el usuario.");
    }
  },

  /**
   * Elimina un usuario
   */
  async deleteUser(userId: string): Promise<void> {
    const res = await fetch(`/api/admin/users?userId=${userId}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Error al eliminar el usuario.");
    }
  },
};
