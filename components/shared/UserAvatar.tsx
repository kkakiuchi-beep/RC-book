import Image from "next/image";
import { cn, getInitials, avatarColor } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  photoURL?: string | null;
  uid?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

const imgSizeMap = { sm: 32, md: 40, lg: 48 };

export function UserAvatar({ name, photoURL, uid = name, size = "md" }: UserAvatarProps) {
  const color = avatarColor(uid);
  const initials = getInitials(name);
  const px = imgSizeMap[size];

  if (photoURL) {
    return (
      <div className={cn("rounded-full overflow-hidden flex-shrink-0", sizeMap[size])}>
        <Image src={photoURL} alt={name} width={px} height={px} className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold",
        color,
        sizeMap[size]
      )}
    >
      {initials}
    </div>
  );
}
