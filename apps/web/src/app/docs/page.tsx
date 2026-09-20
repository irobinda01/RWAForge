import type { Metadata } from "next";
import { DocsContent } from "./docs-content";

export const metadata: Metadata = { title: "Documentation" };

export default function DocsPage() {
  return <DocsContent />;
}
