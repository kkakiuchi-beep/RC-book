import Link from "next/link";
import Image from "next/image";
import { cn, getInitials, avatarColor } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  photoURL?: string | null;
  uid?: string;
  size?: "sm" | "md" | "lg";
  href?: string;
}

const sizeMap = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

const imgSizeMap = { sm: 32, md: 40, lg: 48 };

export function UserAvatar({ name, photoURL, uid = name, size = "md", href }: UserAvatarProps) {
  const color = avatarColor(uid);
  const initials = getInitials(name);
  const px = imgSizeMap[size];

  const avatar = photoURL ? (
    <div className={cn("rounded-full overflow-hidden flex-shrink-0", sizeMap[size])}>
      <Image src={photoURL} alt={name} width={px} height={px} className="object-cover" />
    </div>
  ) : (
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

  if (href) {
    return (
      <Link
        href={href}
        className="flex-shrink-0 hover:opacity-75 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {avatar}
      </Link>
    );
  }

  return avatar;
}
