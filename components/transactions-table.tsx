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

  // Replace "Zeta" with "ZetaChain"
  formatted = formatted.replace(/Zeta\b/g, "ZetaChain");

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
    accessorKey: "tokenSymbol",
    header: "Token",
  },
  {
    accessorKey: "chainName",
    header: "Chain",
    cell: ({ row }) => {
      const chainName = row.getValue("chainName") as string;
      return formatChainName(chainName);
    },
  },
  {
    accessorKey: "amount",
    header: "Amount",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusCell row={row} />,
  },
  {
    accessorKey: "timestamp",
    header: "Time",
    cell: ({ row }) => {
      const timestamp = row.getValue("timestamp") as number;
      const hash = row.original.hash;
      const { isTestnet } = useNetwork();
      const apiUrl = isTestnet
        ? `https://zetachain-athens.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctxData/${hash}`
        : `https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctxData/${hash}`;

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
    },
  },
];

function StatusCell({
  row,
}: {
  row: {
    getValue: (key: keyof Transaction) => Transaction[keyof Transaction];
    original: { hash: string };
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
      const apiUrl = isTestnet
        ? `https://zetachain-athens.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctxData/${hash}`
        : `https://zetachain.blockpi.network/lcd/v1/public/zeta-chain/crosschain/inboundHashToCctxData/${hash}`;

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

export function TransactionsTable() {
  const { transactions, clearTransactions } = useTransactionStore();
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

  const table = useReactTable({
    data: transactions,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Filter transactions..."
            value={
              (table.getColumn("tokenSymbol")?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn("tokenSymbol")?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        </div>
        <div className="flex items-center space-x-2">
          {transactions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="h-8"
              onClick={clearTransactions}
            >
              <IconTrash className="mr-2 h-4 w-4" />
              Clear Transactions
            </Button>
          )}
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
                <TableRow key={row.id}>
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
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} transaction(s)
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
