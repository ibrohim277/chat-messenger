import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { tokenStorage } from "@/lib/api";
import { Loader2, Mail, Lock, KeyRound, CheckCircle2, ArrowLeft, Eye, EyeOff } from "lucide-react";

// 📂 Firebase importlari
import { auth, googleProvider, githubProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";

// SVG Ikonkalar (Custom Google va GitHub chiroyli ko'rinish uchun)
const GoogleIcon = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
    <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3A11.966 11.966 0 0 0 12 .909c-4.427 0-8.29 2.427-10.336 6l3.602 2.856Z"/>
    <path fill="#4285F4" d="M23.455 12.273c0-.818-.064-1.609-.2-2.364H12v4.51h6.427a5.57 5.57 0 0 1-2.409 3.654l3.709 2.873c2.164-1.991 3.427-4.918 3.427-8.673Z"/>
    <path fill="#FBBC05" d="M5.266 14.235A7.12 7.12 0 0 1 4.909 12c0-.79.132-1.55.357-2.235L1.664 6.909A11.934 11.934 0 0 0 0 12c0 1.836.418 3.573 1.164 5.091l4.102-2.856Z"/>
    <path fill="#34A853" d="M12 23.091c3.245 0 5.973-1.073 7.964-2.918l-3.709-2.873c-1.027.691-2.345 1.109-3.927 1.109-3.127 0-5.773-2.11-6.727-4.955L1.909 16.32A11.94 11.94 0 0 0 12 23.091Z"/>
  </svg>
);

const GithubIcon = () => (
  <svg className="h-5 w-5 shrink-0 fill-current text-zinc-900 dark:text-white" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

const schema = z.object({
  email: z.string().email("Yaroqsiz email manzili"),
  password: z.string().min(6, "Parol kamida 6 ta belgidan iborat bo'lishi kerak"),
});

type FormValues = z.infer<typeof schema>;

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [{ title: "Tizimga kirish — EDUNEX Chat" }]
  }),
  beforeLoad: () => {
    if (typeof window !== "undefined" && tokenStorage.getAccess()) {
      throw redirect({ to: "/" });
    }
  },
  component: LoginPage
});

function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const accessToken = useAuthStore((s) => s.accessToken);

  const [page, setPage] = useState<"login" | "email" | "code" | "password">("login");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [customLoading, setCustomLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<FormValues>({
    resolver: zodResolver(schema)
  });

  useEffect(() => {
    if (accessToken) {
      navigate({ to: "/" });
    }
  }, [accessToken, navigate]);

  const loginSubmit = async (values: FormValues) => {
    try {
      await login(values.email, values.password);
      toast.success("Xush kelibsiz!");
      navigate({ to: "/" });
    } catch {
      toast.error("Email yoki parol noto'g'ri");
    }
  };

  const handleFirebaseOAuth = async (provider: any, providerName: string) => {
    setIsOAuthLoading(true);
    try {
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();

      const res = await fetch("https://chat-messenger-server.onrender.com/auth/firebase-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, provider: providerName })
      });

      if (!res.ok) throw new Error("Verifikatsiya xatosi");

      const data = await res.json();
      
      if (data.accessToken) {
        tokenStorage.setAccess(data.accessToken);
        if (data.refreshToken) tokenStorage.setRefresh(data.refreshToken);
        
        toast.success(`${providerName} orqali tizimga kirildi!`);
        window.location.href = "/";
      } else {
        throw new Error("Token topilmadi");
      }
    } catch (error) {
      console.error(error);
      toast.error(`${providerName} orqali kirish muvaffaqiyatsiz tugadi`);
    } finally {
      setIsOAuthLoading(false);
    }
  };

  const loadingState = isSubmitting || isOAuthLoading || customLoading;

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 px-4 py-12 overflow-hidden selection:bg-indigo-500/30">
      
      <div className="absolute top-1/4 -left-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl dark:bg-indigo-500/5 pointer-events-none" />
      <div className="absolute bottom-1/4 -right-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/5 pointer-events-none" />

      <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-900/80 p-6 md:p-8 shadow-xl shadow-zinc-200/50 dark:shadow-none backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {page === "login" && (
          <>
            <div className="flex flex-col items-center mb-6 text-center">
              <div className="h-12 w-12 rounded-2xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20 mb-3">
                N
              </div>
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Tizimga kirish</h1>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 font-medium">Platformaga kirish uchun ma'lumotlarni kiriting</p>
            </div>

            <form onSubmit={handleSubmit(loginSubmit)} className="space-y-4">
              
              {/* ✉️ To'g'rilangan Email Maydoni */}
              <Field label="Email manzili" error={errors.email?.message}>
                <div className="relative w-full flex items-center">
                  <input
                    className="custom-input pl-10 text-black font-mono"
                    type="email"
                    disabled={loadingState}
                    placeholder="name@example.com"
                    {...register("email")}
                  />
                </div>
              </Field>

              {/* 🔒 To'g'rilangan Parol maydoni */}
              <Field label="Parol" error={errors.password?.message}>
                <div className="relative w-full flex items-center">
                  <input
                    className="custom-input pl-10 pr-10 text-black font-mono"
                    type={showPassword ? "text" : "password"}
                    disabled={loadingState}
                    placeholder="••••••••"
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

              <div className="flex justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => setPage("email")}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline active:opacity-70 transition"
                >
                  Parolni unutdingizmi?
                </button>
              </div>

              <button
                type="submit"
                disabled={loadingState}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-950 rounded-xl font-semibold text-sm hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 disabled:pointer-events-none shadow-md"
              >
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : null}
                Kirish
              </button>
            </form>

            <div className="relative my-6 flex items-center justify-center">
              <div className="absolute inset-0 border-t border-zinc-200 dark:border-zinc-800"></div>
              <span className="relative bg-white dark:bg-zinc-900 px-3 text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-wider">Yoki quyidagilar bilan</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={loadingState}
                onClick={() => handleFirebaseOAuth(googleProvider, "Google")}
                className="flex items-center justify-center gap-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 active:scale-[0.98] transition disabled:opacity-50"
              >
                <GoogleIcon />
                Google
              </button>
              
              <button
                type="button"
                disabled={loadingState}
                onClick={() => handleFirebaseOAuth(githubProvider, "GitHub")}
                className="flex items-center justify-center gap-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 active:scale-[0.98] transition disabled:opacity-50"
              >
                <GithubIcon />
                GitHub
              </button>
            </div>

            <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400 font-medium">
              Akkountingiz yo'qmi?
              <Link to="/register" className="text-indigo-600 dark:text-indigo-400 ml-1.5 font-bold hover:underline">
                Ro'yxatdan o'tish
              </Link>
            </p>
          </>
        )}

        {/* 📧 Page: Email Kiritish */}
        {page === "email" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200">
            <button onClick={() => setPage("login")} className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 mb-5 transition">
              <ArrowLeft size={14} /> Orqaga qaytish
            </button>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">Parolni tiklash</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4 font-medium">Tasdiqlash kodini olish uchun email manzilingizni yozing</p>
            
            <Field label="Email">
              <div className="relative w-full flex items-center">
                <div className="absolute left-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none z-10">
                  <Mail size={16} />
                </div>
                <input
                  className="custom-input pl-10"
                  type="email"
                  disabled={customLoading}
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </Field>

            <button
              disabled={customLoading || !email}
              className="w-full bg-indigo-600 dark:bg-indigo-500 text-white dark:text-zinc-950 py-2.5 rounded-xl font-semibold text-sm mt-4 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
              onClick={async () => {
                setCustomLoading(true);
                try {
                  const res = await fetch("https://chat-messenger-server.onrender.com/auth/send-code", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email })
                  });
                  if (res.ok) {
                    toast.success("Tasdiqlash kodi emailingizga yuborildi");
                    setPage("code");
                  } else {
                    toast.error("Email topilmadi yoki xato");
                  }
                } catch {
                  toast.error("Tizimda xatolik");
                } finally {
                  setCustomLoading(false);
                }
              }}
            >
              {customLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              Kod yuborish
            </button>
          </div>
        )}

        {/* 🔢 Page: Kodni Tasdiqlash */}
        {page === "code" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">Kodni kiriting</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4 font-medium"><span className="font-semibold text-zinc-700 dark:text-zinc-300">{email}</span> manziliga yuborilgan 6 xonali kodni kiriting.</p>
            
            <Field label="Tasdiqlash kodi">
              <div className="relative w-full flex items-center">
                <div className="absolute left-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none z-10">
                  <KeyRound size={16} />
                </div>
                <input
                  className="custom-input pl-10 font-mono tracking-widest text-center text-base"
                  placeholder="123456"
                  maxLength={6}
                  disabled={customLoading}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </Field>

            <button
              disabled={customLoading || code.length < 4}
              className="w-full bg-indigo-600 dark:bg-indigo-500 text-white dark:text-zinc-950 py-2.5 rounded-xl font-semibold text-sm mt-4 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
              onClick={async () => {
                setCustomLoading(true);
                try {
                  const res = await fetch("https://chat-messenger-server.onrender.com/auth/check-code", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, code })
                  });
                  if (res.ok) {
                    setPage("password");
                  } else {
                    toast.error("Xato yoki muddati o'tgan kod");
                  }
                } catch {
                  toast.error("Tizimda xatolik");
                } finally {
                  setCustomLoading(false);
                }
              }}
            >
              {customLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              Kodni tekshirish
            </button>
          </div>
        )}

        {/* 🔒 Page: Yangi Parol O'rnatish */}
        {page === "password" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-200">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">Yangi parol</h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mb-4 font-medium">Xavfsiz va esda qoladigan yangi parol o'rnating</p>
            
            <Field label="Yangi parol">
              <div className="relative w-full flex items-center">
                <div className="absolute left-3.5 text-zinc-400 dark:text-zinc-500 pointer-events-none z-10">
                  <Lock size={16} />
                </div>
                <input
                  className="custom-input pl-10 pr-10"
                  type={showResetPassword ? "text" : "password"}
                  placeholder="Yangi parolni kiriting"
                  disabled={customLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors z-10"
                >
                  {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </Field>

            <button
              disabled={customLoading || password.length < 6}
              className="w-full bg-emerald-600 dark:bg-emerald-500 text-white dark:text-zinc-950 py-2.5 rounded-xl font-semibold text-sm mt-4 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
              onClick={async () => {
                setCustomLoading(true);
                try {
                  const res = await fetch("https://chat-messenger-server.onrender.com/auth/reset-password", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password })
                  });
                  if (res.ok) {
                    toast.success("Parol muvaffaqiyatli o'zgartirildi!");
                    setPage("login");
                    setPassword("");
                    setCode("");
                  } else {
                    toast.error("Parolni saqlashda xatolik yuz berdi");
                  }
                } catch {
                  toast.error("Tizimda xatolik");
                } finally {
                  setCustomLoading(false);
                }
              }}
            >
              {customLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              Parolni saqlash
            </button>
          </div>
        )}
      </div>

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

// 🏷️ Global Field elementi endi barcha bolalarini relative o'rab olib xavfsiz ishlaydi
function Field({ 
  label, 
  error, 
  children 
}: { 
  label: string; 
  error?: string; 
  children: React.ReactNode 
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