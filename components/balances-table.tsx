"use client";

import * as React from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { z } from "zod";
import { useTransactionStore } from "@/store/transactions";
import { usePriceStore } from "@/store/prices";
import { useChainsStore } from "@/store/chains";

import { Button } from "@/components/ui/button";
// import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { handleWithdraw } from "@/lib/handlers/withdraw";
import { handleDeposit } from "@/lib/handlers/deposit";
import { roundNumber } from "@/lib/handlers/balances";

// Utility function to format chain names
function formatChainName(chainName: string): string {
  // Replace underscores with spaces
  let formatted = chainName.replace(/_/g, " ");

  // Capitalize each word
  formatted = formatted
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  // Replace "Zeta" with "ZetaChain"
  formatted = formatted.replace(/Zeta\b/g, "ZetaChain");

  return formatted;
}

export const schema = z.object({
  chain_id: z.string(),
  coin_type: z.string(),
  contract: z.string().optional(),
  decimals: z.number(),
  symbol: z.string(),
  zrc20: z.string().optional(),
  chain_name: z.string(),
  id: z.string(),
  ticker: z.string(),
  balance: z.string(),
}) as z.ZodType<{
  chain_id: string;
  coin_type: string;
  contract?: string;
  decimals: number;
  symbol: string;
  zrc20?: string;
  chain_name: string;
  id: string;
  ticker: string;
  balance: string;
}>;

type TokenInfo = {
  symbol: string;
  baseSymbol: string;
  chainName: string;
  balance: string;
  decimals: number;
  contract?: string;
  zrc20?: string;
  chainId: string;
  coin_type: string;
  ticker: string;
};

type AggregatedToken = {
  baseSymbol: string;
  totalBalance: string;
  tokens: TokenInfo[];
};

function aggregateTokens(data: z.infer<typeof schema>[]): AggregatedToken[] {
  const tokenMap = new Map<string, AggregatedToken>();

  data.forEach((token) => {
    // Extract base symbol by removing chain suffixes and ZRC-20 prefixes
    let baseSymbol = token.symbol;

    // Handle ZRC-20 tokens
    if (token.symbol.includes("ZRC20")) {
      // Extract the actual token name from ZRC-20 token names
      // Example: "ZetaChain ZRC20 USDC on ETH" -> "USDC"
      const match = token.symbol.match(/ZRC20\s+([A-Za-z0-9]+)/);
      if (match) {
        baseSymbol = match[1];
      }
    } else {
      // Remove chain suffixes (e.g., ".ETH", ".BSC", etc.)
      baseSymbol = token.symbol.split(".")[0];
    }

    // Special case handling for certain tokens
    if (baseSymbol === "tBNB") baseSymbol = "BNB";
    if (baseSymbol === "tBTC") baseSymbol = "BTC";
    if (baseSymbol === "sBTC") baseSymbol = "BTC";
    if (baseSymbol === "sETH") baseSymbol = "ETH";
    if (baseSymbol === "WZETA") baseSymbol = "ZETA";

    if (!tokenMap.has(baseSymbol)) {
      tokenMap.set(baseSymbol, {
        baseSymbol,
        totalBalance: "0",
        tokens: [],
      });
    }

    const aggregated = tokenMap.get(baseSymbol)!;
    aggregated.tokens.push({
      symbol: token.symbol,
      baseSymbol,
      chainName: token.chain_name,
      balance: token.balance,
      decimals: token.decimals,
      contract: token.contract,
      zrc20: token.zrc20,
      chainId: token.chain_id,
      coin_type: token.coin_type,
      ticker: token.ticker,
    });

    const currentTotal = parseFloat(aggregated.totalBalance);
    const newBalance = parseFloat(token.balance);
    const total = currentTotal + newBalance;
    // Use the first token's ticker for rounding since it represents the same base token
    aggregated.totalBalance = roundNumber(total, token.ticker);
  });

  return Array.from(tokenMap.values());
}

function PriceCell({ ticker }: { ticker: string }) {
  const { prices } = usePriceStore();
  const price = prices.find((p) => p.ticker === ticker)?.usdRate;
  return (
    <div className="text-right font-medium">
      {price ? `$${price.toFixed(2)}` : "-"}
    </div>
  );
}

function ValueCell({ ticker, balance }: { ticker: string; balance: string }) {
  const { prices } = usePriceStore();
  const price = prices.find((p) => p.ticker === ticker)?.usdRate;
  const balanceValue = parseFloat(balance);
  const value = price ? price * balanceValue : null;
  return (
    <div className="text-right font-medium">
      {value ? `$${value.toFixed(2)}` : "-"}
    </div>
  );
}

const columns: ColumnDef<AggregatedToken>[] = [
  // {
  //   id: "select",
  //   header: ({ table }) => (
  //     <div className="flex items-center justify-center">
  //       <Checkbox
  //         checked={
  //           table.getIsAllPageRowsSelected() ||
  //           (table.getIsSomePageRowsSelected() && "indeterminate")
  //         }
  //         onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //         aria-label="Select all"
  //       />
  //     </div>
  //   ),
  //   cell: ({ row }) => (
  //     <div className="flex items-center justify-center">
  //       <Checkbox
  //         checked={row.getIsSelected()}
  //         onCheckedChange={(value) => row.toggleSelected(!!value)}
  //         aria-label="Select row"
  //       />
  //     </div>
  //   ),
  //   enableSorting: false,
  //   enableHiding: false,
  // },
  {
    accessorKey: "baseSymbol",
    header: "Symbol",
    cell: ({ row }) => {
      const token = row.original;
      return (
        <div className="flex flex-col">
          <div className="font-medium">{token.baseSymbol}</div>
          <div className="text-sm text-muted-foreground">
            {token.tokens.length} chains
          </div>
        </div>
      );
    },
    enableHiding: false,
  },
  {
    accessorKey: "totalBalance",
    header: () => <div className="w-full text-right">Balance</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">{row.original.totalBalance}</div>
    ),
  },
  {
    id: "price",
    header: () => <div className="w-full text-right">Price</div>,
    cell: ({ row }) => {
      const token = row.original;
      return <PriceCell ticker={token.tokens[0]?.ticker} />;
    },
  },
  {
    id: "value",
    header: () => <div className="w-full text-right">Value</div>,
    cell: ({ row }) => {
      const token = row.original;
      return (
        <ValueCell
          ticker={token.tokens[0]?.ticker}
          balance={token.totalBalance}
        />
      );
    },
  },
];

function TokenDetails({
  token,
  showZeroBalances,
}: {
  token: AggregatedToken;
  showZeroBalances: boolean;
}) {
  const { primaryWallet } = useDynamicContext();
  const [loadingStates, setLoadingStates] = React.useState<
    Record<string, boolean>
  >({});
  const { transactions } = useTransactionStore();
  const { chains } = useChainsStore();

  // Filter tokens based on showZeroBalances setting
  const filteredTokens = React.useMemo(() => {
    if (showZeroBalances) return token.tokens;
    return token.tokens.filter((t) => parseFloat(t.balance) > 0);
  }, [token.tokens, showZeroBalances]);

  // Function to check if a chain is EVM-compatible
  const isChainEVM = React.useCallback(
    (chainId: string) => {
      const chain = chains.find((c) => c.chain_id === chainId);
      console.log("Chain found:", chain);
      return chain?.vm === "evm";
    },
    [chains]
  );

  // Function to find native asset for a ZRC20 token
  const findNativeAsset = React.useCallback(
    (currentToken: TokenInfo) => {
      if (currentToken.coin_type !== "ZRC20" || !currentToken.contract)
        return null;

      console.log(
        "Looking for native asset with contract:",
        currentToken.contract
      );
      console.log(
        "Available tokens:",
        token.tokens.map((t) => ({
          symbol: t.symbol,
          zrc20: t.zrc20,
          contract: t.contract,
          chainName: t.chainName,
        }))
      );

      // Find the corresponding native asset by matching only the ZRC20 contract
      const nativeAsset = token.tokens.find((t: TokenInfo) => {
        // The native asset has the ZRC20 contract in its zrc20 field
        const matches = t.zrc20 === currentToken.contract;
        console.log(
          "Checking token:",
          t.symbol,
          "zrc20:",
          t.zrc20,
          "matches:",
          matches
        );
        return matches;
      });

      console.log("Found native asset:", nativeAsset);
      return nativeAsset;
    },
    [token.tokens]
  );

  return (
    <div className="space-y-2 p-4">
      <div className="grid gap-2">
        {filteredTokens.map((t) => {
          const pendingTransactions = transactions.filter(
            (tx) =>
              tx.targetToken?.symbol === t.symbol &&
              tx.targetToken?.chainName === t.chainName &&
              (tx.status === "pending" || tx.status === "Initiated")
          );

          const pendingAmount = pendingTransactions.reduce((sum, tx) => {
            const amount = parseFloat(tx.amount);
            return sum + Math.abs(amount);
          }, 0);

          // For ZRC20 tokens, find the native asset and check if its chain is EVM
          const nativeAsset =
            t.coin_type === "ZRC20" ? findNativeAsset(t) : null;
          const targetChainId = nativeAsset?.chainId;
          console.log(
            "Token:",
            t.symbol,
            "Type:",
            t.coin_type,
            "Contract:",
            t.contract
          );
          console.log(
            "Native Asset:",
            nativeAsset?.symbol,
            "Chain ID:",
            targetChainId
          );
          const isTargetChainEVM = targetChainId
            ? isChainEVM(targetChainId)
            : true;

          return (
            <div
              key={`${t.symbol}-${t.chainName}`}
              className="flex items-center justify-between rounded-md border p-2"
            >
              <div className="flex flex-col">
                <div className="font-medium">
                  {formatChainName(t.chainName)}
                </div>
                <div className="text-sm text-muted-foreground">{t.symbol}</div>
                {/* {t.coin_type === "ZRC20" && (
                  <div className="text-xs text-muted-foreground">
                    Target Chain: {nativeAsset?.chainName || "Unknown"}
                  </div>
                )} */}
              </div>
              <div className="text-right">
                <div className="font-medium">{t.balance}</div>
                {pendingTransactions.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    +{pendingAmount.toFixed(4)} pending
                  </div>
                )}
                {t.contract && (
                  <div className="text-xs text-muted-foreground">
                    {t.contract.slice(0, 6)}...{t.contract.slice(-4)}
                  </div>
                )}
                {t.chainId === "7000" || t.chainId === "7001" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() =>
                      handleWithdraw(t, primaryWallet, setLoadingStates)
                    }
                    disabled={
                      loadingStates[`${t.symbol}-${t.chainName}`] ||
                      (t.coin_type === "ZRC20" &&
                        (!nativeAsset || !isTargetChainEVM)) ||
                      t.symbol === "ZETA" ||
                      t.symbol === "WZETA"
                    }
                  >
                    {loadingStates[`${t.symbol}-${t.chainName}`] ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Withdrawing...
                      </div>
                    ) : t.symbol === "ZETA" || t.symbol === "WZETA" ? (
                      "Withdraw"
                    ) : t.coin_type === "ZRC20" && !nativeAsset ? (
                      "Withdraw"
                    ) : t.coin_type === "ZRC20" && !isTargetChainEVM ? (
                      "Withdraw"
                    ) : (
                      "Withdraw"
                    )}
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() =>
                      handleDeposit(t, primaryWallet, setLoadingStates)
                    }
                    disabled={
                      loadingStates[`${t.symbol}-${t.chainName}`] ||
                      t.symbol === "ZETA" ||
                      t.symbol === "WZETA"
                    }
                  >
                    {loadingStates[`${t.symbol}-${t.chainName}`] ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        Depositing...
                      </div>
                    ) : t.symbol === "ZETA" || t.symbol === "WZETA" ? (
                      "Deposit"
                    ) : (
                      "Deposit"
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function BalancesTable({
  data: initialData,
}: {
  data: z.infer<typeof schema>[];
}) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "value", desc: true },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(
    new Set()
  );
  const [showZeroBalances, setShowZeroBalances] = React.useState(false);
  const { prices } = usePriceStore();

  const aggregatedData = React.useMemo(
    () => aggregateTokens(initialData),
    [initialData]
  );

  // Calculate total portfolio value in USD and track included/excluded tokens
  const { totalValue, includedTokens, excludedTokens } = React.useMemo(() => {
    const included: string[] = [];
    const excluded: string[] = [];

    const total = aggregatedData.reduce((total, token) => {
      const price = prices.find(
        (p) => p.ticker === token.tokens[0]?.ticker
      )?.usdRate;
      const balance = parseFloat(token.totalBalance);

      if (balance > 0) {
        if (price) {
          included.push(token.baseSymbol);
          return total + price * balance;
        } else {
          excluded.push(token.baseSymbol);
        }
      }
      return total;
    }, 0);

    return {
      totalValue: total,
      includedTokens: included,
      excludedTokens: excluded,
    };
  }, [aggregatedData, prices]);

  // Filter out zero balances if showZeroBalances is false
  const filteredData = React.useMemo(() => {
    if (showZeroBalances) return aggregatedData;
    return aggregatedData.filter((token) => {
      const balance = parseFloat(token.totalBalance);
      return balance > 0;
    });
  }, [aggregatedData, showZeroBalances]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const toggleRow = (baseSymbol: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(baseSymbol)) {
        next.delete(baseSymbol);
      } else {
        next.add(baseSymbol);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col">
          <div className="text-sm text-muted-foreground">Total Value</div>
          <div className="text-3xl font-bold">
            $
            {totalValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {excludedTokens.length > 0 && (
              <span>
                + {excludedTokens.slice(0, 5).join(", ")}
                {excludedTokens.length > 5 && "..."}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center space-x-2">
            <Input
              placeholder="Filter tokens..."
              value={
                (table.getColumn("baseSymbol")?.getFilterValue() as string) ??
                ""
              }
              onChange={(event) =>
                table
                  .getColumn("baseSymbol")
                  ?.setFilterValue(event.target.value)
              }
              className="h-8 w-[150px] lg:w-[250px]"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowZeroBalances(!showZeroBalances)}
              className="h-8"
            >
              {showZeroBalances ? "Hide Zero Balances" : "Show Zero Balances"}
            </Button>
          </div>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <React.Fragment key={row.original.baseSymbol}>
                  <TableRow
                    className="cursor-pointer"
                    onClick={() => toggleRow(row.original.baseSymbol)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expandedRows.has(row.original.baseSymbol) && (
                    <TableRow>
                      <TableCell colSpan={columns.length}>
                        <TokenDetails
                          token={row.original}
                          showZeroBalances={showZeroBalances}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <IconChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <IconChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
