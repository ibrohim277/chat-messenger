import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { tokenStorage } from "@/lib/api";
import { Loader2, Mail, Lock, User, UserCircle2, Eye, EyeOff } from "lucide-react";

const schema = z.object({
  username: z
    .string()
    .min(3, "Kamida 3 ta belgi bo'lishi kerak")
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Faqat harflar, raqamlar va pastki chiziq"),
  email: z.string().email("Yaroqsiz email manzili"),
  password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
  displayName: z.string().max(50).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [{ title: "Ro'yxatdan o'tish — EDUNEX Chat" }]
  }),
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

  // 👁️ Parolni ko'rsatish/yashirish uchun state
  const [showPassword, setShowPassword] = useState(false);

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
      toast.success("Akkount muvaffaqiyatli yaratildi!");
      navigate({ to: "/" });
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Ro'yxatdan o'tishda xatolik";
      toast.error(typeof msg === "string" ? msg : "Ro'yxatdan o'tishda xatolik");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 px-4 py-12 overflow-hidden selection:bg-indigo-500/30">
      
      {/* 🎆 Orqa fondagi blur effektlar */}
      <div className="absolute top-1/4 -left-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/5 pointer-events-none" />
      <div className="absolute bottom-1/4 -right-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/5 pointer-events-none" />

      <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 p-6 md:p-8 shadow-xl shadow-zinc-200/50 dark:shadow-none backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="h-12 w-12 rounded-2xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20 mb-3">
            N
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Hisob yaratish</h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium">Suhbatlarga qo'shilish uchun ro'yxatdan o'ting</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* 👤 Username */}
          <Field label="Foydalanuvchi nomi (Username)" error={errors.username?.message}>
            <div className="relative w-full flex items-center">
              <div className="absolute left-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none z-10">
                <User size={16} />
              </div>
              <input 
                className="custom-input pl-10" 
                placeholder="jane_doe" 
                disabled={isSubmitting}
                {...register("username")} 
              />
            </div>
          </Field>

          {/* 🎭 Display Name */}
          <Field label="Ko'rinadigan ism (Optional)" error={errors.displayName?.message}>
            <div className="relative w-full flex items-center">
              <div className="absolute left-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none z-10">
                <UserCircle2 size={16} />
              </div>
              <input 
                className="custom-input pl-10" 
                placeholder="Jane Doe" 
                disabled={isSubmitting}
                {...register("displayName")} 
              />
            </div>
          </Field>

          {/* ✉️ Email */}
          <Field label="Email manzili" error={errors.email?.message}>
            <div className="relative w-full flex items-center">
              <div className="absolute left-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none z-10">
                <Mail size={16} />
              </div>
              <input
                type="email"
                autoComplete="email"
                className="custom-input pl-10"
                placeholder="you@example.com"
                disabled={isSubmitting}
                {...register("email")}
              />
            </div>
          </Field>

          {/* 🔒 Password (ko'rsatish/yashirish tugmasi bor) */}
          <Field label="Parol" error={errors.password?.message}>
            <div className="relative w-full flex items-center">
              <div className="absolute left-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none z-10">
                <Lock size={16} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="custom-input pl-10 pr-10"
                placeholder="••••••••"
                disabled={isSubmitting}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors z-10"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none shadow-md mt-2"
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
            Ro'yxatdan o'tish
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400 font-medium">
          Akkountingiz bormi?{" "}
          <Link to="/login" className="text-indigo-600 dark:text-indigo-400 ml-1.5 font-bold hover:underline">
            Tizimga kirish
          </Link>
        </p>
      </div>

      {/* 🎨 Custom inputlar uchun umumiy login.tsx uslubidagi CSS stillari */}
      <style>{`
        .custom-input {
          width: 100%;
          border: 1px solid rgb(228 228 231 / 0.8);
          background-color: transparent;
          padding: 0.65rem 0.75rem;
          font-size: 0.875rem;
          border-radius: 0.75rem;
          outline: none;
          transition: all 0.2s ease;
        }
        .dark .custom-input {
          border-color: rgb(63 63 70 / 0.8);
          color: rgb(250 250 250);
        }
        .custom-input:focus {
          border-color: rgb(79 70 229);
          box-shadow: 0 0 0 2px rgb(79 70 229 / 0.15);
        }
        .dark .custom-input:focus {
          border-color: rgb(99 102 241);
          box-shadow: 0 0 0 2px rgb(99 102 241 / 0.2);
        }
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
    <div className="block space-y-1.5 w-full">
      <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 tracking-wide">{label}</span>
      <div className="w-full">
        {children}
      </div>
      {error && (
        <p className="text-red-500 text-[11px] font-medium animate-in fade-in slide-in-from-left-1 duration-150">
          {error}
        </p>
      )}
    </div>
  );
}