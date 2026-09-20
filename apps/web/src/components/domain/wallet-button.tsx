"use client";

import { Wallet } from "lucide-react";
import { toast } from "sonner";
import { useWallet } from "@/components/providers/wallet-provider";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { truncateAddress } from "./address-display";

export function WalletButton() {
  const { session, connecting, connectWallet, disconnectWallet } = useWallet();

  if (!session) {
    return (
      <Button onClick={() => void connectWallet()} disabled={connecting} size="sm" className="group">
        <Wallet className="h-4 w-4 transition-transform duration-200 group-hover:rotate-6" />
        {connecting ? "Connecting…" : "Connect Wallet"}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {/* Plain text here (not the interactive AddressDisplay) -- this trigger is
            itself a button, and nesting an interactive copy control inside it
            would produce invalid, unpredictable nested-button HTML. */}
        <Button variant="secondary" size="sm">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
          </span>
          <span className="font-mono text-[13px]">{truncateAddress(session.address)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            void navigator.clipboard.writeText(session.address);
            toast.success("Address copied");
          }}
        >
          Copy address
        </DropdownMenuItem>
        <DropdownMenuItem onClick={disconnectWallet} className="text-destructive focus:text-destructive">
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
