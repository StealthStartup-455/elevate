"use client";

import { useActionState } from "react";
import type { ClimberInput, FormState } from "../types";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: ClimberInput;
  submitLabel: string;
  /** Replace the form with the success message once it submits (customer flow). */
  hideOnSuccess?: boolean;
};

const EMPTY: ClimberInput = {
  firstName: "",
  lastName: "",
  phone: "",
  dateOfBirth: "",
};

const INPUT =
  "min-h-11 w-full rounded-md border border-foreground/30 bg-transparent px-3 text-base";

type FieldName = keyof ClimberInput;

export default function ClimberForm({
  action,
  defaults = EMPTY,
  submitLabel,
  hideOnSuccess = false,
}: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    { status: "idle" },
  );

  if (hideOnSuccess && state.status === "success") {
    return (
      <p role="status" className="rounded-md border border-foreground/30 p-4">
        {state.message}
      </p>
    );
  }

  const values = state.values ?? defaults;
  const errors = state.errors ?? {};

  function input(name: FieldName, type: string, extra: object = {}) {
    return (
      <input
        id={name}
        name={name}
        type={type}
        required
        defaultValue={values[name]}
        aria-invalid={errors[name] ? true : undefined}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
        className={INPUT}
        {...extra}
      />
    );
  }

  return (
    <form
      action={formAction}
      className="flex w-full max-w-md flex-col gap-4"
      noValidate
    >
      <Field label="First name" name="firstName" error={errors.firstName}>
        {input("firstName", "text", { autoComplete: "given-name" })}
      </Field>
      <Field label="Last name" name="lastName" error={errors.lastName}>
        {input("lastName", "text", { autoComplete: "family-name" })}
      </Field>
      <Field label="Phone number" name="phone" error={errors.phone}>
        {input("phone", "tel", { inputMode: "tel", autoComplete: "tel" })}
      </Field>
      <Field label="Date of birth" name="dateOfBirth" error={errors.dateOfBirth}>
        {input("dateOfBirth", "date", { autoComplete: "bday" })}
      </Field>

      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={state.status === "error" ? "text-red-600" : undefined}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md bg-foreground px-4 text-base font-medium text-background disabled:opacity-60"
      >
        {pending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: FieldName;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${name}-error`} className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  );
}
