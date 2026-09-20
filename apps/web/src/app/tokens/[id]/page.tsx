import type { Metadata } from "next";
import { TokenDetail } from "./token-detail";

export const metadata: Metadata = { title: "Token" };

export default async function TokenDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <TokenDetail tokenId={Number(id)} />
    </div>
  );
}
