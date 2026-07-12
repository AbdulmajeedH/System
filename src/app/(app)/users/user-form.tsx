"use client";

import { useActionState, useState } from "react";
import { Role } from "@/generated/prisma/enums";
import { t } from "@/lib/i18n/ar";
import { DEPARTMENT_SCOPED_ROLES } from "@/lib/validations/users";
import type { FormState } from "@/lib/utils/action-state";
import { Button, Card, FormField, Input, Select } from "@/components/ui";

export type DepartmentOption = { id: string; nameAr: string };

type UserFormValues = {
  name: string;
  email: string;
  phone: string;
  role: Role;
  departmentId: string;
};

export function UserForm({
  action,
  departments,
  initial,
  isCreate,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  departments: DepartmentOption[];
  initial?: UserFormValues;
  isCreate: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [role, setRole] = useState<Role>(initial?.role ?? Role.EMPLOYEE);
  const needsDepartment = DEPARTMENT_SCOPED_ROLES.includes(role);

  return (
    <Card className="max-w-lg">
      <form action={formAction} className="space-y-4">
        <FormField label={t.users.name} required error={state.fieldErrors?.name}>
          <Input name="name" defaultValue={initial?.name} required />
        </FormField>
        <FormField label={t.auth.email} required error={state.fieldErrors?.email}>
          <Input name="email" type="email" dir="ltr" defaultValue={initial?.email} required />
        </FormField>
        <FormField label={t.users.phone} error={state.fieldErrors?.phone}>
          <Input name="phone" type="tel" dir="ltr" defaultValue={initial?.phone} />
        </FormField>
        <FormField label={t.users.role} required error={state.fieldErrors?.role}>
          <Select
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {Object.values(Role).map((r) => (
              <option key={r} value={r}>
                {t.roles[r]}
              </option>
            ))}
          </Select>
        </FormField>
        <FormField
          label={t.users.department}
          required={needsDepartment}
          error={state.fieldErrors?.departmentId}
        >
          <Select name="departmentId" defaultValue={initial?.departmentId ?? ""}>
            <option value="">{t.common.none}</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nameAr}
              </option>
            ))}
          </Select>
        </FormField>
        {isCreate ? (
          <FormField
            label={t.auth.password}
            required
            hint={t.users.passwordHint}
            error={state.fieldErrors?.password}
          >
            <Input name="password" type="password" dir="ltr" required minLength={8} />
          </FormField>
        ) : null}
        {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? t.common.loading : t.common.save}
        </Button>
      </form>
    </Card>
  );
}
