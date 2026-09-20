import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="max-w-md">
            <p className="text-sm font-semibold text-foreground">RWAForge</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              RWAForge provides Stacks Testnet infrastructure for creating and purchasing
              on-chain tokens. It is not a legal adviser, securities regulator, or licensed
              investment platform. Creating a token does not by itself establish legal
              ownership of an underlying real-world asset — see the docs for details.
            </p>
          </div>
          <div className="flex gap-10 text-sm">
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-subtle-foreground">Product</span>
              <Link href="/tokens" className="text-muted-foreground hover:text-foreground">Explore Tokens</Link>
              <Link href="/create" className="text-muted-foreground hover:text-foreground">Create Token</Link>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-subtle-foreground">Resources</span>
              <Link href="/docs" className="text-muted-foreground hover:text-foreground">Documentation</Link>
              <a href="https://explorer.hiro.so" target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">
                Stacks Explorer
              </a>
            </div>
          </div>
        </div>
        <p className="mt-8 text-xs text-subtle-foreground">
          © {new Date().getFullYear()} RWAForge. Built on Stacks, secured by Bitcoin.
        </p>
      </div>
    </footer>
  );
}
