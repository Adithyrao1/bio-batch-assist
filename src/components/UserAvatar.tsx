import { cn } from "@/lib/utils";

const AVATAR_COLORS = [
  "#e53935", // red
  "#d81b60", // pink
  "#8e24aa", // purple
  "#5e35b1", // deep purple
  "#1e88e5", // blue
  "#00897b", // teal
  "#43a047", // green
  "#f4511e", // deep orange
  "#6d4c41", // brown
  "#546e7a", // blue grey
];

function getColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface UserAvatarProps {
  name: string;
  profilePicture?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function UserAvatar({ name, profilePicture, size = "sm", className }: UserAvatarProps) {
  const bgColor = getColorFromName(name || "?");
  const initials = getInitials(name || "?");
  const sizeClass = sizeClasses[size];

  if (profilePicture) {
    return (
      <img
        src={profilePicture}
        alt={name}
        className={cn(
          "rounded-full object-cover flex-shrink-0",
          sizeClass,
          className
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "rounded-full flex items-center justify-center font-semibold text-white flex-shrink-0 select-none",
        sizeClass,
        className
      )}
      style={{ backgroundColor: bgColor }}
      aria-label={name}
    >
      {initials}
    </span>
  );
}
