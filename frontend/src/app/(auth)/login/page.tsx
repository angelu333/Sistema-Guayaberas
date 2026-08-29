"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button, Input, Card } from "@/components/ui";
import { authService } from "@/services/auth.service";
import { useAuthStore } from "@/stores/auth.store";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El correo electronico es requerido")
    .email("Ingrese un correo electronico valido"),
  password: z
    .string()
    .min(1, "La contrasena es requerida")
    .min(6, "La contrasena debe tener al menos 6 caracteres"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = Router();
  const setSession = useAuthStore((state) => state.setSession);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setErrorMsg(null);
    try {
      const session = await authService.login(data);
      setSession(session);
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Error inesperado al iniciar sesion.");
      }
    }
  };


  return (
    <Card padding="lg" className="w-full shadow-lg">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-[#26302B] font-[Outfit]">
          Iniciar Sesión
        </h1>
        <p className="text-sm text-[#6B7A71] mt-1">
          Ingrese a la plataforma de gestión de su empresa
        </p>
      </div>

      {errorMsg && (
        <div
          className="mb-5 p-3.5 bg-[#FAEAEA] border border-[#B85450]/30 rounded-lg text-xs text-[#B85450] flex items-center gap-2"
          role="alert"
        >
          <span className="font-semibold">Error:</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Correo electrónico"
          type="email"
          placeholder="admin@empresa.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="pt-2">
          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={isSubmitting}
          >
            Iniciar Sesión
          </Button>
        </div>
      </form>

      <div className="mt-6 pt-6 border-t border-[#DDD9D0] text-center text-xs text-[#6B7A71]">
        ¿Su empresa aún no tiene cuenta?{" "}
        <Link
          href="/register"
          className="text-[#556B5D] font-semibold hover:underline"
        >
          Registrar nueva empresa
        </Link>
      </div>
    </Card>
  );
}

function Router() {
  return useRouter();
}
