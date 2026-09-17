"use client";

import React, { Suspense } from "react";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Typography,
} from "@mui/material";

export function SettingsRow({
  title,
  action,
  children,
  component = "p",
}: {
  title: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  component?: React.ElementType;
}) {
  return (
    <Suspense>
      <TableRow>
        <TableCell colSpan={action ? 1 : 2}>
          <Typography variant="h5">{title}</Typography>
          <Typography variant="body1" component={component}>
            {children}
          </Typography>
        </TableCell>
        {action && (
          <TableCell align="right" className="min-w-[200px]">
            {action}
          </TableCell>
        )}
      </TableRow>
    </Suspense>
  );
}

export function SettingsTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-8 mt-8 first:mt-0">
      <TableContainer component={Paper}>
        <Table>
          <TableBody>
            <Suspense>{children}</Suspense>
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
