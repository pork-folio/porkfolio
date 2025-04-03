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
    accessorKey: "targetToken.symbol",
    header: "Token",
    cell: ({ row }) => {
      const targetToken = row.original.targetToken;
      return targetToken ? targetToken.symbol : row.original.tokenSymbol;
    },
  },
  {
    accessorKey: "targetToken.chainName",
    header: "Chain",
    cell: ({ row }) => {
      const targetToken = row.original.targetToken;
      const chainName = targetToken
        ? targetToken.chainName
        : row.original.chainName;
      return formatChainName(chainName);
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
        <Button
          variant="outline"
          size="sm"
          className="ml-auto h-8"
          onClick={clearTransactions}
        >
          <IconTrash className="mr-2 h-4 w-4" />
          Clear
        </Button>
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
