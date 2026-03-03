interface RoleBadgeProps {
  role: string;
}

const RoleBadge = ({ role }: RoleBadgeProps) => {
  const getColor = () => {
    switch (role?.toLowerCase()) {
      case "superadmin":
        return "bg-red-600";
      case "admin":
        return "bg-blue-600";
      case "rider":
        return "bg-yellow-600";
      case "user":
        return "bg-green-600";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <span
      className={`px-3 py-1 text-xs font-medium rounded-full text-white ${getColor()}`}
    >
      {role}
    </span>
  );
};

export default RoleBadge;