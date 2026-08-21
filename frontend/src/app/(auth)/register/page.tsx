"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button, Input, Card } from "@/components/ui";
import { authService } from "@/services/auth.service";

const registerSchema = z
  .object({
    companyName: z
      .string()
      .min(1, "El nombre de la empresa es requerido")
      .min(3, "El nombre debe tener al menos 3 caracteres"),
    slug: z
      .string()
      .min(1, "El identificador URL es requerido")
      .regex(/^[a-z0-9-]+$/, "Solo letras minusculas, numeros y guiones"),
    fullName: z
      .string()
      .min(1, "El nombre del administrador es requerido"),
    email: z
      .string()
      .min(1, "El correo electronico es requerido")
      .email("Ingrese un correo electronico valido"),
    password: z
      .string()
      .min(1, "La contrasena es requerida")
      .min(6, "La contrasena debe tener al menos 6 caracteres"),
    confirmPassword: z
      .string()
      .min(1, "Confirme su contrasena"),
    phone: z.string().optional(),
    rfc: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contrasenas no coinciden",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  // Genera un slug automaticamente al escribir el nombre de la empresa
  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const generatedSlug = value
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");

    setValue("companyName", value);
    setValue("slug", generatedSlug, { shouldValidate: true });
  };

  const onSubmit = async (data: RegisterFormData) => {
    setErrorMsg(null);
    try {
      await authService.registerCompany({
        companyName: data.companyName,
        slug: data.slug,
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        phone: data.phone,
        rfc: data.rfc,
      });

      router.push("/login?registered=true");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Error inesperado al registrar la empresa.");
      }
    }
  };

  return (
    <Card padding="lg" className="w-full shadow-lg my-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-[#26302B] font-[Outfit]">
          Registrar Empresa
        </h1>
        <p className="text-sm text-[#6B7A71] mt-1">
          Cree una cuenta para gestionar su negocio de guayaberas
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
        <div className="border-b border-[#DDD9D0] pb-3 mb-3">
          <h2 className="text-xs font-semibold text-[#8FA393] uppercase tracking-wider mb-3">
            Datos de la Empresa
          </h2>

          <div className="space-y-3">
            <Input
              label="Nombre de la empresa"
              placeholder="Guayaberas El Yucateco"
              error={errors.companyName?.message}
              onChange={handleCompanyNameChange}
            />

            <Input
              label="Identificador URL (slug)"
              placeholder="el-yucateco"
              hint="Se utilizara para la direccion del catalogo publico"
              error={errors.slug?.message}
              {...register("slug")}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Telefono (opcional)"
                placeholder="9991234567"
                error={errors.phone?.message}
                {...register("phone")}
              />

              <Input
                label="RFC (opcional)"
                placeholder="XAXX010101000"
                error={errors.rfc?.message}
                {...register("rfc")}
              />
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-semibold text-[#8FA393] uppercase tracking-wider mb-3">
            Datos del Administrador
          </h2>

          <div className="space-y-3">
            <Input
              label="Nombre completo"
              placeholder="Carlos Chan"
              error={errors.fullName?.message}
              {...register("fullName")}
            />

            <Input
              label="Correo electrónico"
              type="email"
              placeholder="admin@empresa.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register("email")}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Contraseña"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register("password")}
              />

              <Input
                label="Confirmar contraseña"
                type="password"
                placeholder="••••••••"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register("confirmPassword")}
              />
            </div>
          </div>
        </div>

        <div className="pt-3">
          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={isSubmitting}
          >
            Crear Cuenta y Registrar Empresa
          </Button>
        </div>
      </form>

      <div className="mt-6 pt-6 border-t border-[#DDD9D0] text-center text-xs text-[#6B7A71]">
        ¿Su empresa ya tiene una cuenta?{" "}
        <Link
          href="/login"
          className="text-[#556B5D] font-semibold hover:underline"
        >
          Iniciar sesión
        </Link>
      </div>
    </Card>
  );
}
