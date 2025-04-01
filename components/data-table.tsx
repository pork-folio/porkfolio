"use client";

import * as React from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { ethers } from "ethers";
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
import { ZetaChainClient } from "@zetachain/toolkit/client";
import { getSigner } from "@dynamic-labs/ethers-v6";

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
  chainId: string;
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
      chainId: token.chain_id,
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
  const { primaryWallet } = useDynamicContext();

  const handleWithdraw = async (tokenInfo: TokenInfo) => {
    try {
      if (!primaryWallet) {
        alert("Please connect your wallet first");
        return;
      }

      // Get the signer from Dynamic
      const signer = await getSigner(primaryWallet);

      // Determine which network to use
      const network = tokenInfo.chainId === "7000" ? "mainnet" : "testnet";

      // Initialize ZetaChain client with the signer
      const client = new ZetaChainClient({
        network,
        signer,
      });

      // Get the gateway address
      const gatewayAddress = await client.getGatewayAddress();

      // Create contract instance to get gas fee
      const zrc20Contract = new ethers.Contract(
        tokenInfo.contract!,
        ["function withdrawGasFee() view returns (address, uint256)"],
        signer
      );

      // Get gas fee information
      const [gasZRC20, gasFee] = await zrc20Contract.withdrawGasFee();
      console.log("Gas fee:", gasFee.toString(), "Gas token:", gasZRC20);

      // Calculate withdrawal amount by subtracting gas fee and taking 99%
      const totalAmount = ethers.parseUnits(
        tokenInfo.balance,
        tokenInfo.decimals
      );
      const availableAmount = totalAmount - gasFee;
      const withdrawalAmount = (availableAmount * BigInt(90)) / BigInt(100);

      // Create revert options
      const revertOptions = {
        revertAddress: ethers.ZeroAddress,
        callOnRevert: false,
        onRevertGasLimit: 0,
        revertMessage: "",
      };

      // Create transaction options
      const txOptions = {
        gasLimit: undefined,
        gasPrice: undefined,
        maxFeePerGas: undefined,
        maxPriorityFeePerGas: undefined,
        nonce: undefined,
      };

      // Execute withdrawal with adjusted amount
      const { tx } = await client.zetachainWithdraw({
        amount: ethers.formatUnits(withdrawalAmount, tokenInfo.decimals),
        receiver: primaryWallet.address,
        zrc20: tokenInfo.contract!,
        gatewayZetaChain: gatewayAddress,
        revertOptions,
        txOptions,
      });

      console.log("Withdrawal transaction:", tx);
      await tx.wait();
      console.log("Withdrawal successful!");
    } catch (error) {
      console.error("Withdrawal failed:", error);
    }
  };

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
              {t.chainId === "7000" || t.chainId === "7001" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => handleWithdraw(t)}
                >
                  Withdraw
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => console.log("Deposit token:", t)}
                >
                  Deposit
                </Button>
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
