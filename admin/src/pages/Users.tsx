import {
  useUsers,
} from "../hooks/useUsers";
import {
  useUserFilters,
} from "../hooks/useUserFilters";
import {
  useUserInit,
} from "../hooks/useUserInit";

import Avatar from "../components/users/Avatar";
import RoleBadge from "../components/users/RoleBadge";
import Pagination from "../components/users/Pagination";
import ActionMenu from "../components/users/ActionMenu";

export default function Users() {
  const {
    users,
    total,
    page,
    loadUsers,
  } = useUsers();

  const {
    activeRoleFilter,
    search,
  } = useUserFilters();

  const {
    roles,
  } = useUserInit();

  return (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">
        Users
      </h1>

      <table className="w-full mt-6">
        <tbody>
          {users.map((u) => (
            <tr key={u._id}>
              <td>
                <Avatar name={u.name} />
              </td>
              <td>{u.name}</td>
              <td>
                <RoleBadge
                  name={
                    typeof u.roleId ===
                    "object"
                      ? u.roleId?.name
                      : undefined
                  }
                />
              </td>
              <td>
                <ActionMenu
                  user={u}
                  roles={roles}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Pagination
        page={page}
        total={total}
        onChange={(p) =>
          loadUsers(
            p,
            activeRoleFilter,
            search
          )
        }
      />
    </div>
  );
}