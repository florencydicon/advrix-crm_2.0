import { notFound } from "next/navigation";
import {
  getSharedBoardRowsAction,
  getSharedClientMetaAction,
} from "@/lib/actions/masterboard";
import SharedBoard from "@/components/SharedBoard";

export const metadata = { title: "Client Dashboard — Advrix" };

export default async function SharedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [meta, rows] = await Promise.all([
    getSharedClientMetaAction(token),
    getSharedBoardRowsAction(token),
  ]);

  if (!meta) notFound();

  return (
    <SharedBoard
      clientName={meta.client_name}
      clientCompany={meta.client_company}
      rows={rows}
    />
  );
}
