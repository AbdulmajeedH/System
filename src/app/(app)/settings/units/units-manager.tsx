"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n/ar";
import { formatQty } from "@/lib/utils/format";
import type { FormState } from "@/lib/utils/action-state";
import { Badge, Button, Card, FormField, Input, Select } from "@/components/ui";
import { createConversion, createUnit } from "../actions";

type UnitRow = { id: string; code: string; nameAr: string };
type ConversionRow = { id: string; fromName: string; toName: string; factor: string };

export function UnitsManager({
  units,
  conversions,
}: {
  units: UnitRow[];
  conversions: ConversionRow[];
}) {
  const [unitState, unitAction, unitPending] = useActionState<FormState, FormData>(createUnit, {});
  const [convState, convAction, convPending] = useActionState<FormState, FormData>(
    createConversion,
    {},
  );

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap gap-2">
          {units.map((unit) => (
            <Badge key={unit.id} tone="teal">
              {unit.nameAr} <span className="dir-ltr ms-1 text-[10px] opacity-70">{unit.code}</span>
            </Badge>
          ))}
        </div>
        <form action={unitAction} className="mt-4 space-y-3">
          <h2 className="font-bold">{t.settings.unitNew}</h2>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t.settings.unitCode} required error={unitState.fieldErrors?.code}>
              <Input name="code" dir="ltr" placeholder="TRAY" required />
            </FormField>
            <FormField label={t.settings.unitName} required>
              <Input name="nameAr" required />
            </FormField>
          </div>
          {unitState.success ? (
            <p className="text-sm text-success">{t.common.savedSuccessfully}</p>
          ) : null}
          {unitState.error ? <p className="text-sm text-danger" role="alert">{unitState.error}</p> : null}
          <Button type="submit" variant="secondary" disabled={unitPending}>
            {unitPending ? t.common.loading : t.common.save}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="font-bold mb-2">{t.settings.units}</h2>
        {conversions.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">{t.common.noResults}</p>
        ) : (
          <ul className="divide-y divide-border">
            {conversions.map((c) => (
              <li key={c.id} className="py-2 text-sm">
                ١ {c.fromName} = <span className="dir-ltr font-bold">{formatQty(c.factor)}</span>{" "}
                {c.toName}
              </li>
            ))}
          </ul>
        )}
        <form action={convAction} className="mt-4 space-y-3">
          <h2 className="font-bold">{t.settings.conversionNew}</h2>
          <p className="text-xs text-muted">{t.settings.conversionExample}</p>
          <div className="grid grid-cols-2 gap-3">
            <FormField label={t.settings.conversionFrom} required>
              <Select name="fromUnitId" defaultValue={units[0]?.id}>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nameAr}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              label={t.settings.conversionTo}
              required
              error={convState.fieldErrors?.toUnitId}
            >
              <Select name="toUnitId" defaultValue={units[1]?.id ?? units[0]?.id}>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nameAr}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>
          <FormField
            label={t.settings.conversionFactor}
            required
            error={convState.fieldErrors?.factor}
          >
            <Input name="factor" type="number" inputMode="decimal" step="0.0001" min="0.0001" required />
          </FormField>
          {convState.success ? (
            <p className="text-sm text-success">{t.common.savedSuccessfully}</p>
          ) : null}
          {convState.error ? <p className="text-sm text-danger" role="alert">{convState.error}</p> : null}
          <Button type="submit" variant="secondary" disabled={convPending}>
            {convPending ? t.common.loading : t.common.save}
          </Button>
        </form>
      </Card>
    </div>
  );
}
