"use client";

import * as React from "react";
import {
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTransactionStore, Transaction } from "@/store/transactions";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useNetwork } from "@/components/providers";
import { useRebalancingStore } from "@/store/rebalancing";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Add keyframes for rotation animation
const refreshAnimation = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

// Utility function to format chain names
function formatChainName(chainName: string): string {
  // Replace underscores with spaces
  let formatted = chainName.replace(/_/g, " ");

  // Capitalize each word
  formatted = formatted
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  // Replace "Zeta" with "ZetaChain" and handle testnet cases
  formatted = formatted.replace(/Zeta\b/g, "ZetaChain");

  // If both chains are ZetaChain, only show it once
  if (formatted === "ZetaChain Testnet") {
    return "ZetaChain";
  }

  return formatted;
}

const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("type") as Transaction["type"];
      return (
        <Badge variant={type === "deposit" ? "default" : "secondary"}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Badge>
      );
    },
  },
  {
    accessorKey: "targetToken.symbol",
    header: "Token",
    cell: ({ row }) => {
      const sourceToken = row.original.sourceToken;
      const targetToken = row.original.targetToken;
      const type = row.original.type;

      if (type === "rebalance" && sourceToken && targetToken) {
        return (
          <div className="flex items-center gap-1">
            <span>{sourceToken.symbol}</span>
            <span>→</span>
            <span>{targetToken.symbol}</span>
          </div>
        );
      }

      return targetToken ? targetToken.symbol : row.original.tokenSymbol;
    },
  },
  {
    accessorKey: "targetToken.chainName",
    header: "Chain",
    cell: ({ row }) => {
      const sourceToken = row.original.sourceToken;
      const targetToken = row.original.targetToken;

      if (!sourceToken || !targetToken) {
        return formatChainName(row.original.chainName);
      }

      const sourceChain = sourceToken.chainName.toLowerCase();
      const targetChain = targetToken.chainName.toLowerCase();

      // If both chains are zetachain (testnet or mainnet), just show ZetaChain
      if (sourceChain.includes("zeta") && targetChain.includes("zeta")) {
        return "ZetaChain";
      }

      return (
        <div className="flex items-center gap-1">
          <span>{formatChainName(sourceToken.chainName)}</span>
          <span>→</span>
          <span>{formatChainName(targetToken.chainName)}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
  },
  {
    accessorKey: "rebalancingGroupId",
    header: "Rebalancing",
    cell: ({ row }) => {
      const rebalancingGroupId = row.getValue("rebalancingGroupId") as string;
      const operations = useRebalancingStore((state) => state.operations);
      const operation = operations.find((op) => op.id === rebalancingGroupId);
      return operation ? (
        <Badge variant="outline">{operation.strategy.name}</Badge>
      ) : (
        "-"
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusCell row={row} />,
  },
  {
    accessorKey: "timestamp",
    header: "Time",
    cell: ({ row }) => <TimestampCell row={row} />,
  },
];

const TRANSACTION_STATUS_BASE_URL = {
  mainnet:
    "https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctxData",
  testnet:
    "https://zetachain-athens.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctxData",
};

const ZETA_RPC_URL = {
  mainnet: "https://zetachain-evm.blockpi.network/v1/rpc/public",
  testnet: "https://zetachain-athens-evm.blockpi.network/v1/rpc/public",
};

function StatusCell({
  row,
}: {
  row: {
    getValue: (key: keyof Transaction) => Transaction[keyof Transaction];
    original: Transaction;
  };
}) {
  const status = row.getValue("status") as Transaction["status"];
  const hash = row.original.hash;
  const updateStatus = useTransactionStore.getState().updateTransactionStatus;
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const { isTestnet } = useNetwork();

  const checkStatus = async () => {
    setIsRefreshing(true);
    const startTime = Date.now();
    try {
      const sourceToken = row.original.sourceToken;
      const targetToken = row.original.targetToken;

      // Check if both source and target chains are ZetaChain
      const isZetaChainTransaction =
        sourceToken &&
        targetToken &&
        sourceToken.chainName.toLowerCase().includes("zeta") &&
        targetToken.chainName.toLowerCase().includes("zeta");

      if (isZetaChainTransaction) {
        // For ZetaChain transactions, check status via RPC
        const rpcUrl = ZETA_RPC_URL[isTestnet ? "testnet" : "mainnet"];
        const response = await fetch(rpcUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_getTransactionReceipt",
            params: [hash],
            id: 1,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const receipt = data.result;
          if (receipt) {
            // Check if transaction was successful
            if (receipt.status === "0x1") {
              updateStatus(hash, "completed");
            } else {
              updateStatus(hash, "failed");
            }
          } else {
            // Transaction not found or still pending
            updateStatus(hash, "Initiated");
          }
        }
      } else {
        const apiUrl = `${
          TRANSACTION_STATUS_BASE_URL[isTestnet ? "testnet" : "mainnet"]
        }/${hash}`;
        const response = await fetch(apiUrl);

        if (response.status === 404) {
          updateStatus(hash, "Initiated");
        } else if (response.ok) {
          const data = await response.json();
          const cctxStatus = data.CrossChainTxs[0]?.cctx_status?.status;
          if (cctxStatus === "OutboundMined") {
            updateStatus(hash, "completed");
          } else if (cctxStatus === "Aborted") {
            updateStatus(hash, "failed");
          }
        }
      }
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      // Ensure the animation runs for at least 1 second
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime < 1000) {
        await new Promise((resolve) => setTimeout(resolve, 1000 - elapsedTime));
      }
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={
          status === "completed"
            ? "default"
            : status === "pending" || status === "Initiated"
            ? "secondary"
            : "destructive"
        }
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={checkStatus}
        disabled={isRefreshing}
      >
        <style>{refreshAnimation}</style>
        <IconRefresh
          className={cn(
            "h-4 w-4",
            isRefreshing && "animate-[spin_1s_linear_infinite]"
          )}
        />
      </Button>
    </div>
  );
}

function TimestampCell({
  row,
}: {
  row: {
    getValue: (key: keyof Transaction) => Transaction[keyof Transaction];
    original: { hash: string };
  };
}) {
  const timestamp = row.getValue("timestamp") as number;
  const hash = row.original.hash;
  const { isTestnet } = useNetwork();
  const apiUrl = `${
    TRANSACTION_STATUS_BASE_URL[isTestnet ? "testnet" : "mainnet"]
  }/${hash}`;

  return (
    <a
      href={apiUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 hover:underline"
    >
      {formatDistanceToNow(timestamp, { addSuffix: true })}
    </a>
  );
}

export function TransactionsTable() {
  const { transactions, clearTransactions } = useTransactionStore();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = React.useState(false);
  const { isTestnet } = useNetwork();
  const updateStatus = useTransactionStore(
    (state) => state.updateTransactionStatus
  );

  const refreshAllNonCompleted = async () => {
    setIsRefreshingAll(true);
    const nonCompletedTransactions = transactions.filter(
      (tx) => tx.status !== "completed" && tx.status !== "failed"
    );

    // Refresh each transaction sequentially to avoid overwhelming the API
    for (const tx of nonCompletedTransactions) {
      const sourceToken = tx.sourceToken;
      const targetToken = tx.targetToken;

      // Check if both source and target chains are ZetaChain
      const isZetaChainTransaction =
        sourceToken &&
        targetToken &&
        sourceToken.chainName.toLowerCase().includes("zeta") &&
        targetToken.chainName.toLowerCase().includes("zeta");

      try {
        if (isZetaChainTransaction) {
          // For ZetaChain transactions, check status via RPC
          const rpcUrl = ZETA_RPC_URL[isTestnet ? "testnet" : "mainnet"];
          const response = await fetch(rpcUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              method: "eth_getTransactionReceipt",
              params: [tx.hash],
              id: 1,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const receipt = data.result;
            if (receipt) {
              // Check if transaction was successful
              if (receipt.status === "0x1") {
                updateStatus(tx.hash, "completed");
              } else {
                updateStatus(tx.hash, "failed");
              }
            }
          }
        } else {
          const apiUrl = `${
            TRANSACTION_STATUS_BASE_URL[isTestnet ? "testnet" : "mainnet"]
          }/${tx.hash}`;

          const response = await fetch(apiUrl);
          if (response.status === 404) {
            updateStatus(tx.hash, "Initiated");
          } else if (response.ok) {
            const data = await response.json();
            const cctxStatus = data.CrossChainTxs[0]?.cctx_status?.status;
            if (cctxStatus === "OutboundMined") {
              updateStatus(tx.hash, "completed");
            } else if (cctxStatus === "Aborted") {
              updateStatus(tx.hash, "failed");
            }
          }
        }
      } catch (error) {
        console.error(
          `Error checking status for transaction ${tx.hash}:`,
          error
        );
      }
      // Add a small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    setIsRefreshingAll(false);
  };

  React.useEffect(() => {
    console.log("Transactions:", transactions);
  }, []);

  const table = useReactTable({
    data: transactions,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Filter transactions..."
            value={(table.getColumn("type")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("type")?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAllNonCompleted}
            disabled={isRefreshingAll}
            className="h-8"
          >
            <IconRefresh
              className={cn(
                "mr-2 h-4 w-4",
                isRefreshingAll && "animate-[spin_1s_linear_infinite]"
              )}
            />
            Refresh All
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="ml-auto h-8">
                <IconTrash className="mr-2 h-4 w-4" />
                Clear
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Are you sure?</DialogTitle>
                <DialogDescription>
                  This action will clear all transactions from the table. This
                  action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    clearTransactions();
                    setIsDialogOpen(false);
                  }}
                >
                  Clear Transactions
                </Button>
              </div>
            </DialogContent>
          </Dialog>
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
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
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
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No transactions.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
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
  );
}
