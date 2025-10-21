"use client";

import { useCallback, type Dispatch, type SetStateAction } from "react";

import { createPayee, deletePayee, updatePayee } from "@/domain/repo";

import type { PayeeRow } from "./types";
import { sortPayeesList } from "./useAccountsLedgerData";

type PayeeActions = {
  create: (name: string) => Promise<PayeeRow>;
  rename: (id: string, name: string) => Promise<PayeeRow>;
  remove: (id: string) => Promise<void>;
};

type SetPayees = Dispatch<SetStateAction<PayeeRow[]>>;

export function usePayeeActions(payees: PayeeRow[], setPayees: SetPayees): PayeeActions {
  const normalize = useCallback((value: string) => value.trim(), []);

  const findExisting = useCallback(
    (name: string, ignoreId?: string) => {
      const normalized = normalize(name);
      if (!normalized) return null;
      return (
        payees.find(
          (payee) =>
            (ignoreId ? payee.id !== ignoreId : true) &&
            payee.name.localeCompare(normalized, "pt-BR", { sensitivity: "accent" }) === 0,
        ) ?? null
      );
    },
    [normalize, payees],
  );

  const create = useCallback(
    async (name: string) => {
      const normalized = normalize(name);
      if (!normalized) {
        throw new Error("Informe um nome válido para o beneficiário.");
      }
      const existing = findExisting(normalized);
      if (existing) {
        return existing;
      }
      const created = await createPayee(normalized);
      setPayees((prev) => sortPayeesList([...prev, created]));
      return created;
    },
    [findExisting, normalize, setPayees],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      const normalized = normalize(name);
      if (!normalized) {
        throw new Error("Informe um nome válido para o beneficiário.");
      }
      const duplicate = findExisting(normalized, id);
      if (duplicate) {
        throw new Error("Já existe um beneficiário com este nome.");
      }
      const updated = await updatePayee(id, normalized);
      setPayees((prev) => sortPayeesList(prev.map((payee) => (payee.id === id ? updated : payee))));
      return updated;
    },
    [findExisting, normalize, setPayees],
  );

  const remove = useCallback(
    async (id: string) => {
      await deletePayee(id);
      setPayees((prev) => prev.filter((payee) => payee.id !== id));
    },
    [setPayees],
  );

  return { create, rename, remove };
}
