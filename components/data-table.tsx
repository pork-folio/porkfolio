"use client";

import * as React from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
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

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
};

type AggregatedToken = {
  baseSymbol: string;
  totalBalance: string;
  tokens: TokenInfo[];
};

function aggregateTokens(data: z.infer<typeof schema>[]): AggregatedToken[] {
  const tokenMap = new Map<string, AggregatedToken>();

  data.forEach((token) => {
    const baseSymbol = token.symbol.split(".")[0];

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
    });

    const currentTotal = parseFloat(aggregated.totalBalance);
    const newBalance = parseFloat(token.balance);
    aggregated.totalBalance = (currentTotal + newBalance).toString();
  });

  return Array.from(tokenMap.values());
}

const columns: ColumnDef<AggregatedToken>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
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
    header: () => <div className="w-full text-right">Total Balance</div>,
    cell: ({ row }) => (
      <div className="text-right font-medium">{row.original.totalBalance}</div>
    ),
  },
];

function TokenDetails({ token }: { token: AggregatedToken }) {
  return (
    <div className="space-y-2 p-4">
      <div className="text-sm font-medium">Chain Details</div>
      <div className="grid gap-2">
        {token.tokens.map((t) => (
          <div
            key={`${t.symbol}-${t.chainName}`}
            className="flex items-center justify-between rounded-md border p-2"
          >
            <div className="flex flex-col">
              <div className="font-medium">{t.chainName}</div>
              <div className="text-sm text-muted-foreground">{t.symbol}</div>
            </div>
            <div className="text-right">
              <div className="font-medium">{t.balance}</div>
              {t.contract && (
                <div className="text-xs text-muted-foreground">
                  {t.contract.slice(0, 6)}...{t.contract.slice(-4)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DataTable({
  data: initialData,
}: {
  data: z.infer<typeof schema>[];
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(
    new Set()
  );

  const aggregatedData = React.useMemo(
    () => aggregateTokens(initialData),
    [initialData]
  );

  const table = useReactTable({
    data: aggregatedData,
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
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <Input
            placeholder="Filter tokens..."
            value={
              (table.getColumn("baseSymbol")?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn("baseSymbol")?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
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
                        <TokenDetails token={row.original} />
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
