import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { tokenStorage } from "@/lib/api";

const schema = z.object({
  username: z
    .string()
    .min(3, "Min 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, underscore only"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
  displayName: z.string().max(50).optional().or(z.literal("")),
});
type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — Chat" }] }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && tokenStorage.getAccess()) {
      throw redirect({ to: "/" });
    }
  },
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const registerUser = useAuthStore((s) => s.register);
  const accessToken = useAuthStore((s) => s.accessToken);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    if (accessToken) navigate({ to: "/" });
  }, [accessToken, navigate]);

  const onSubmit = async (values: FormValues) => {
    try {
      await registerUser({
        username: values.username,
        email: values.email,
        password: values.password,
        displayName: values.displayName || undefined,
      });
      toast.success("Account created");
      navigate({ to: "/" });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Registration failed";
      toast.error(typeof msg === "string" ? msg : "Registration failed");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Create account</h1>
          <p className="mt-1 text-sm text-muted-foreground">Join the conversation</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Username" error={errors.username?.message}>
            <input className="input" placeholder="jane_doe" {...register("username")} />
          </Field>
          <Field label="Display name (optional)" error={errors.displayName?.message}>
            <input className="input" placeholder="Jane" {...register("displayName")} />
          </Field>
          <Field label="Email" error={errors.email?.message}>
            <input
              type="email"
              autoComplete="email"
              className="input"
              placeholder="you@example.com"
              {...register("email")}
            />
          </Field>
          <Field label="Password" error={errors.password?.message}>
            <input
              type="password"
              autoComplete="new-password"
              className="input"
              placeholder="••••••••"
              {...register("password")}
            />
          </Field>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
      <style>{`
        .input { width:100%; border-radius:.5rem; background:var(--input); border:1px solid var(--border); padding:.625rem .75rem; font-size:.875rem; color:var(--foreground); outline:none; transition:border-color .15s; }
        .input:focus { border-color:var(--ring); }
      `}</style>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}
