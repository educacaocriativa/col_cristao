import Image from "next/image";

interface ColCristLogoProps {
  size?: number;
  className?: string;
}

export default function ColCristLogo({ size = 120, className = "" }: ColCristLogoProps) {
  return (
    <Image
      src="/logo_cristao.png"
      alt="Colégio Cristão"
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
