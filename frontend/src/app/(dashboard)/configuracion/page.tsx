"use client";

import { useState, useEffect } from "react";
import {
  Building2,
  User,
  KeyRound,
  Save,
  CheckCircle,
  AlertCircle,
  Share2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Shield,
  Sparkles,
  Bell,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Card, Button, Input } from "@/components/ui";
import { useAuthStore } from "@/stores/auth.store";
import { useTenantStore } from "@/stores/tenant.store";
import { settingsService, type UpdateTenantDTO } from "@/services/settings.service";
import { BrandLogoUploader } from "@/components/configuracion/BrandLogoUploader";
import { NotificationsSettings } from "@/components/configuracion/NotificationsSettings";

type SettingsTab = "company" | "profile" | "notifications";

export default function SettingsPage() {
  const { session, setSession } = useAuthStore();
  const { tenant, setTenant } = useTenantStore();

  const [activeTab, setActiveTab] = useState<SettingsTab>("company");
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Estados del Formulario de Empresa
  const [companyName, setCompanyName] = useState("");
  const [slug, setSlug] = useState("");
  const [rfc, setRfc] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [ticketFooter, setTicketFooter] = useState("");

  const [savingCompany, setSavingCompany] = useState(false);
  const [companySuccess, setCompanySuccess] = useState(false);
  const [companyError, setCompanyError] = useState<string | null>(null);

  // Estados del Formulario de Perfil
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Estados de Cambio de Contraseña
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Cargar datos actuales
  useEffect(() => {
    async function loadData() {
      const tenantId = tenant?.id || session?.tenantId;
      if (!tenantId) return;

      try {
        const { tenant: t, settings: s } = await settingsService.getTenantInfo(tenantId);
        setTenant(t);

        setCompanyName(t.name || "");
        setSlug(t.slug || "");
        setRfc(t.rfc || "");
        setPhone(t.phone || "");
        setEmail(t.email || "");
        setAddress(t.address || "");
        setWhatsapp(t.whatsapp || "");
        setLogoUrl(t.logoUrl || null);
        setTicketFooter(s?.ticketFooter || "");

        if (session?.fullName) {
          setFullName(session.fullName);
        }
      } catch (err) {
        console.error("Error al cargar configuración:", err);
      } finally {
        setLoadingInitial(false);
      }
    }

    loadData();
  }, [tenant?.id, session?.tenantId, session?.fullName, setTenant]);

  // Guardar Datos de la Empresa y Logo
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const tenantId = tenant?.id || session?.tenantId;
    if (!tenantId) return;

    setSavingCompany(true);
    setCompanySuccess(false);
    setCompanyError(null);

    try {
      const payload: UpdateTenantDTO = {
        name: companyName,
        slug,
        rfc,
        phone,
        email,
        address,
        whatsapp,
        logoUrl,
        ticketFooter,
      };

      await settingsService.updateTenantProfile(tenantId, payload);

      // Actualizar stores locales
      if (tenant) {
        setTenant({
          ...tenant,
          name: companyName,
          slug,
          rfc,
          phone,
          email,
          address,
          whatsapp,
          logoUrl,
        });
      }

      if (session) {
        setSession({
          ...session,
          companyName,
          tenantSlug: slug,
        });
      }

      setCompanySuccess(true);
      setTimeout(() => setCompanySuccess(false), 4000);
    } catch (err: any) {
      setCompanyError(err.message || "Error al guardar los datos de la empresa.");
    } finally {
      setSavingCompany(false);
    }
  };

  // Guardar Nombre de Perfil
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId) return;

    setSavingProfile(true);
    setProfileSuccess(false);
    setProfileError(null);

    try {
      await settingsService.updateUserProfile(session.userId, fullName);
      setSession({
        ...session,
        fullName,
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err: any) {
      setProfileError(err.message || "Error al actualizar perfil.");
    } finally {
      setSavingProfile(false);
    }
  };

  // Cambiar Contraseña
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);

    if (newPassword.length < 6) {
      setPasswordError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Las contraseñas no coinciden.");
      return;
    }

    setSavingPassword(true);

    try {
      await settingsService.changePassword(newPassword);
      setPasswordSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(false), 4000);
    } catch (err: any) {
      setPasswordError(err.message || "Error al cambiar contraseña.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header
        title="Configuración y Ajustes"
        subtitle="Administre la identidad de su marca, datos comerciales, logotipo y seguridad de acceso"
      />

      <div className="page-container space-y-6">
        {/* Navegación por Pestañas */}
        <div className="flex items-center gap-2 border-b border-[#DDD9D0] pb-2">
          <button
            onClick={() => setActiveTab("company")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "company"
                ? "bg-[#556B5D] text-white shadow-sm"
                : "bg-white text-[#6B7A71] hover:text-[#26302B] border border-[#DDD9D0]"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Identidad de Marca y Empresa
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "profile"
                ? "bg-[#556B5D] text-white shadow-sm"
                : "bg-white text-[#6B7A71] hover:text-[#26302B] border border-[#DDD9D0]"
            }`}
          >
            <User className="w-4 h-4" />
            Mi Perfil y Seguridad
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === "notifications"
                ? "bg-[#556B5D] text-white shadow-sm"
                : "bg-white text-[#6B7A71] hover:text-[#26302B] border border-[#DDD9D0]"
            }`}
          >
            <Bell className="w-4 h-4" />
            Notificaciones Push
          </button>
        </div>

        {loadingInitial ? (
          <div className="p-12 text-center text-xs text-[#6B7A71] flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-3 border-[#556B5D] border-t-transparent rounded-full animate-spin" />
            <span>Cargando datos de configuración...</span>
          </div>
        ) : (
          <>
            {/* ============================================================
                PESTAÑA 1: IDENTIDAD DE MARCA Y EMPRESA
                ============================================================ */}
            {activeTab === "company" && (
              <form onSubmit={handleSaveCompany} className="space-y-6">
                {/* 1. Logotipo Oficial */}
                <Card padding="md">
                  <BrandLogoUploader logoUrl={logoUrl} onChange={setLogoUrl} />
                </Card>

                {/* 2. Datos Generales de la Empresa */}
                <Card padding="md" className="space-y-4">
                  <h3 className="text-sm font-bold text-[#26302B] font-[Outfit] border-b border-[#DDD9D0] pb-2 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#556B5D]" />
                    Datos Comerciales y Catálogo Público
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input
                      label="Nombre Comercial / Marca"
                      placeholder="Ej: Guayaberas Montejo, Ábito"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-[#26302B]">
                        Enlace de tu Catálogo Público
                      </label>
                      <div className="flex items-center">
                        <span className="bg-[#EBF0EC] border border-r-0 border-[#DDD9D0] px-3 py-2 text-xs text-[#556B5D] font-mono rounded-l-xl">
                          /catalogo/
                        </span>
                        <input
                          type="text"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value)}
                          placeholder="mi-marca"
                          className="w-full rounded-r-xl border border-[#DDD9D0] bg-white px-3 py-2 text-xs text-[#26302B] focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30"
                          required
                        />
                      </div>
                    </div>

                    <Input
                      label="WhatsApp de Atención a Clientes"
                      placeholder="Ej: 529991234567 (10 dígitos)"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                    />

                    <Input
                      label="Teléfono de la Tienda / Taller"
                      placeholder="Ej: 999 923 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />

                    <Input
                      label="Correo Electrónico de Contacto"
                      type="email"
                      placeholder="contacto@guayaberas.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />

                    <Input
                      label="RFC (Opcional)"
                      placeholder="GUA210915XXX"
                      value={rfc}
                      onChange={(e) => setRfc(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#26302B]">
                      Dirección Física del Taller / Tienda
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Calle 60 #450 x 49 y 51, Centro, Mérida, Yucatán"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-xs text-[#26302B] focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#26302B]">
                      Mensaje de Pie de Página en Tickets y Cotizaciones
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: ¡Gracias por su compra! Confección artesanal 100% yucateca."
                      value={ticketFooter}
                      onChange={(e) => setTicketFooter(e.target.value)}
                      className="w-full rounded-xl border border-[#DDD9D0] bg-white px-3 py-2 text-xs text-[#26302B] focus:outline-none focus:ring-2 focus:ring-[#556B5D]/30"
                    />
                  </div>
                </Card>

                {/* Alertas */}
                {companyError && (
                  <div className="p-3 bg-[#FAEAEA] border border-[#B85450]/30 rounded-xl text-xs text-[#B85450] flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{companyError}</span>
                  </div>
                )}

                {companySuccess && (
                  <div className="p-3 bg-[#EBF5F0] border border-[#A7D7B9] rounded-xl text-xs text-[#3F7D58] flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span className="font-bold">¡Datos comerciales y logotipo actualizados con éxito!</span>
                  </div>
                )}

                {/* Botón Guardar */}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={savingCompany}
                    className="bg-[#556B5D] hover:bg-[#44564A] text-white font-bold px-6 py-2.5 text-xs rounded-xl shadow-sm flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {savingCompany ? "Guardando Cambios..." : "Guardar Datos de la Empresa"}
                  </Button>
                </div>
              </form>
            )}

            {/* ============================================================
                PESTAÑA 2: MI PERFIL Y SEGURIDAD
                ============================================================ */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                {/* 1. Datos del Usuario */}
                <Card padding="md">
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <h3 className="text-sm font-bold text-[#26302B] font-[Outfit] border-b border-[#DDD9D0] pb-2 flex items-center gap-2">
                      <User className="w-4 h-4 text-[#556B5D]" />
                      Mi Perfil de Acceso
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Nombre Completo"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                      />

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-[#26302B]">
                          Correo Electrónico de Sesión
                        </label>
                        <input
                          type="email"
                          value={session?.email || ""}
                          disabled
                          className="w-full rounded-xl border border-[#DDD9D0] bg-[#F8F6F1] px-3 py-2 text-xs text-[#6B7A71] cursor-not-allowed"
                        />
                        <span className="text-[10px] text-[#8FA393]">
                          El correo está vinculado a la cuenta de autenticación.
                        </span>
                      </div>
                    </div>

                    {profileError && (
                      <div className="p-3 bg-[#FAEAEA] border border-[#B85450]/30 rounded-xl text-xs text-[#B85450]">
                        {profileError}
                      </div>
                    )}

                    {profileSuccess && (
                      <div className="p-3 bg-[#EBF5F0] border border-[#A7D7B9] rounded-xl text-xs text-[#3F7D58] font-bold">
                        ¡Nombre de perfil actualizado correctamente!
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={savingProfile}
                        className="bg-[#556B5D] hover:bg-[#44564A] text-xs font-bold"
                      >
                        {savingProfile ? "Guardando..." : "Actualizar Nombre"}
                      </Button>
                    </div>
                  </form>
                </Card>

                {/* 2. Cambio de Contraseña */}
                <Card padding="md">
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <h3 className="text-sm font-bold text-[#26302B] font-[Outfit] border-b border-[#DDD9D0] pb-2 flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#556B5D]" />
                      Cambiar Contraseña de Acceso
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input
                        label="Nueva Contraseña"
                        type="password"
                        placeholder="Mínimo 6 caracteres"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />

                      <Input
                        label="Confirmar Nueva Contraseña"
                        type="password"
                        placeholder="Repita la nueva contraseña"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>

                    {passwordError && (
                      <div className="p-3 bg-[#FAEAEA] border border-[#B85450]/30 rounded-xl text-xs text-[#B85450]">
                        {passwordError}
                      </div>
                    )}

                    {passwordSuccess && (
                      <div className="p-3 bg-[#EBF5F0] border border-[#A7D7B9] rounded-xl text-xs text-[#3F7D58] font-bold">
                        ¡Contraseña modificada con éxito! Utilízala en tu próximo inicio de sesión.
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        disabled={savingPassword}
                        className="bg-[#26302B] hover:bg-[#1A221E] text-white text-xs font-bold"
                      >
                        {savingPassword ? "Actualizando Contraseña..." : "Guardar Nueva Contraseña"}
                      </Button>
                    </div>
                  </form>
                </Card>
              </div>
            )}

            {/* ============================================================
                PESTAÑA 3: NOTIFICACIONES PUSH
                ============================================================ */}
            {activeTab === "notifications" && (
              <NotificationsSettings />
            )}
          </>
        )}
      </div>
    </div>
  );
}
