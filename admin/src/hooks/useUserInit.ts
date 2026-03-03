import { useEffect, useState } from "react";
import api from "../api/client";
import { getMe, getPermissions } from "../auth";
import { User } from "./useUsers";

export type Role = {
  _id: string;
  name: string;
};

export function useUserInit() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] =
    useState<string[]>([]);
  const [currentRole, setCurrentRole] =
    useState<string | null>(null);
  const [initialUser, setInitialUser] =
    useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const me = await getMe();
      const meData = me.data;

      const roleName =
        meData?.roleId?.name ??
        meData?.role ??
        null;

      if (cancelled) return;

      setCurrentRole(roleName);

      const perms = await getPermissions();
      setPermissions(perms);

      if (
        !perms.includes("users:view") &&
        roleName !== "superadmin"
      ) {
        setInitialUser(meData);
        return;
      }

      const rolesRes =
        await api.get("/admin/roles");

      const rolesData =
        rolesRes.data?.data ??
        rolesRes.data ??
        [];

      setRoles(rolesData);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return {
    roles,
    permissions,
    currentRole,
    initialUser,
  };
}