import { notFound } from "next/navigation";

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  // MVP 階段暫時不開放房東功能，直接導向 404
  notFound();
  return <>{children}</>;
}
