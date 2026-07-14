"use client";

import { useActionState, useState } from "react";
import { ApprovalTransactionType, Role } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { formatMoney } from "@/lib/utils/format";
import type { FormState } from "@/lib/utils/action-state";
import { Badge, Button, Card, FormField, Input, Select } from "@/components/ui";
import { saveApprovalRule, setApprovalRuleActive } from "../actions";
import { ToggleActiveButton } from "../toggle-button";

export type RuleRow = {
  id: string;
  transactionType: ApprovalTransactionType;
  minAmount: string;
  maxAmount: string;
  departmentId: string;
  departmentName: string | null;
  requiredRole: Role;
  level: number;
  isActive: boolean;
};

export function RulesManager({
  rules,
  departments,
}: {
  rules: RuleRow[];
  departments: Array<{ id: string; nameAr: string }>;
}) {
  const [editing, setEditing] = useState<RuleRow | null>(null);
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    (prev, formData) => saveApprovalRule(editing?.id ?? null, prev, formData),
    {},
  );

  return (
    <div className="space-y-4">
      <Card className="space-y-2">
        {rules.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t.common.noResults}</p>
        ) : (
          <ul className="divide-y divide-border">
            {rules.map((rule) => (
              <li key={rule.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge tone="blue">{t.approvals.types[rule.transactionType]}</Badge>
                  <span className="dir-ltr text-xs text-muted">
                    {rule.minAmount ? formatMoney(rule.minAmount) : "—"} ≤ x &lt;{" "}
                    {rule.maxAmount ? formatMoney(rule.maxAmount) : "∞"}
                  </span>
                  <Badge tone="teal">{t.roles[rule.requiredRole]}</Badge>
                  {rule.departmentName ? <Badge tone="gray">{rule.departmentName}</Badge> : null}
                  {!rule.isActive ? <Badge tone="red">{t.common.inactive}</Badge> : null}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary-soft"
                    onClick={() => setEditing(rule)}
                  >
                    {t.common.edit}
                  </button>
                  <ToggleActiveButton
                    id={rule.id}
                    isActive={rule.isActive}
                    action={setApprovalRuleActive}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <form action={formAction} className="space-y-4" key={editing?.id ?? "new"}>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">
              {editing ? `${t.common.edit}: ${t.approvals.types[editing.transactionType]}` : t.settings.ruleNew}
            </h2>
            {editing ? (
              <button
                type="button"
                className="text-xs font-semibold text-muted hover:text-foreground"
                onClick={() => setEditing(null)}
              >
                {t.common.cancel}
              </button>
            ) : null}
          </div>
          <FormField label={t.settings.ruleType} required>
            <Select name="transactionType" defaultValue={editing?.transactionType ?? "PURCHASE_INVOICE"}>
              {Object.values(ApprovalTransactionType).map((type) => (
                <option key={type} value={type}>
                  {t.approvals.types[type]}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField
              label={t.settings.ruleMin}
              hint={t.settings.ruleNoBound}
              error={state.fieldErrors?.minAmount}
            >
              <Input
                name="minAmount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                defaultValue={editing?.minAmount}
              />
            </FormField>
            <FormField
              label={t.settings.ruleMax}
              hint={t.settings.ruleNoBound}
              error={state.fieldErrors?.maxAmount}
            >
              <Input
                name="maxAmount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                defaultValue={editing?.maxAmount}
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t.settings.ruleRole} required>
              <Select name="requiredRole" defaultValue={editing?.requiredRole ?? "GENERAL_MANAGER"}>
                {Object.values(Role).map((role) => (
                  <option key={role} value={role}>
                    {t.roles[role]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label={t.common.department}>
              <Select name="departmentId" defaultValue={editing?.departmentId ?? ""}>
                <option value="">{t.common.all}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nameAr}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField label={t.settings.ruleLevel} error={state.fieldErrors?.level}>
            <Input name="level" type="number" min="1" max="5" defaultValue={editing?.level ?? 1} />
          </FormField>
          {state.success ? <p className="text-sm text-success">{t.common.savedSuccessfully}</p> : null}
          {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
          <Button type="submit" disabled={pending}>
            {pending ? t.common.loading : t.common.save}
          </Button>
        </form>
      </Card>
    </div>
  );
}
