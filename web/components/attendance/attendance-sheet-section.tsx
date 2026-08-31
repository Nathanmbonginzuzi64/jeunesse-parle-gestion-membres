"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AttendanceSheetTable } from "@/components/attendance/attendance-sheet-table";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/field";
import { Alert, EmptyState, TableSkeleton } from "@/components/ui/feedback";
import { Pagination } from "@/components/ui/table";
import { useApi, useDebounced } from "@/lib/hooks";
import type { AttendanceRow, AttendanceSheet } from "@/lib/types";

export function AttendanceSheetSection({
  activityId,
  refreshKey = 0,
  recordedOnly = false,
  onSelectRow,
  title = "Liste des participants",
  description = "Recherche, filtres et pagination",
  headerAction,
}: {
  activityId: number | string;
  refreshKey?: number;
  /** N'affiche que les membres ayant une présence enregistrée. */
  recordedOnly?: boolean;
  onSelectRow?: (row: AttendanceRow) => void;
  title?: string;
  description?: string;
  headerAction?: ReactNode;
}) {
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const debouncedQ = useDebounced(q);

  useEffect(() => {
    setPage(1);
    setQ("");
    setStatusFilter("");
    setMethodFilter("");
  }, [activityId]);

  const query = useMemo(
    () => ({
      page,
      per_page: perPage,
      q: debouncedQ || undefined,
      status: statusFilter || undefined,
      method: methodFilter || undefined,
      recorded_only: recordedOnly ? 1 : undefined,
    }),
    [page, perPage, debouncedQ, statusFilter, methodFilter, recordedOnly],
  );

  const sheet = useApi<AttendanceSheet>(`/activities/${activityId}/attendance/sheet`, query);

  useEffect(() => {
    if (refreshKey > 0) {
      sheet.reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const data = sheet.data;

  return (
    <Card>
      <CardHeader title={title} description={description} action={headerAction} />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input
            placeholder="Rechercher un membre…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            className="min-w-[200px] flex-1"
          />
          {!recordedOnly ? (
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tous statuts</option>
              <option value="present">Présent</option>
              <option value="absent">Absent</option>
              <option value="late">En retard</option>
              <option value="excused">Excusé</option>
              <option value="not_recorded">Non pointé</option>
            </Select>
          ) : (
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Toutes présences confirmées</option>
              <option value="present">Présent</option>
              <option value="absent">Absent</option>
              <option value="late">En retard</option>
              <option value="excused">Excusé</option>
            </Select>
          )}
          <Select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Toutes méthodes</option>
            <option value="qr">QR Code</option>
            <option value="fingerprint">Biométrie</option>
            <option value="manual">Manuel</option>
          </Select>
          <Select
            value={perPage}
            onChange={(e) => {
              setPerPage(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value={10}>10 / page</option>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </Select>
        </div>

        {sheet.error ? <Alert tone="error">{sheet.error}</Alert> : null}

        {sheet.loading && !data ? (
          <TableSkeleton />
        ) : !data?.rows.length ? (
          <EmptyState
            title={recordedOnly ? "Aucune présence confirmée" : "Aucun participant"}
            description={
              recordedOnly
                ? "Aucun membre n'a encore confirmé sa présence pour cette activité."
                : "Aucun résultat pour ces filtres."
            }
          />
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-slate-100">
              <AttendanceSheetTable rows={data.rows} onSelect={onSelectRow} />
            </div>
            {data.meta ? (
              <Pagination
                page={data.meta.current_page}
                lastPage={data.meta.last_page}
                total={data.meta.total}
                perPage={data.meta.per_page}
                onChange={setPage}
                label={recordedOnly ? "présences confirmées" : "membres"}
              />
            ) : null}
          </>
        )}
      </CardBody>
    </Card>
  );
}
