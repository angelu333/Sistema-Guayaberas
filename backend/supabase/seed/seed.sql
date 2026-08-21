-- ============================================================
-- Datos de prueba (seed) para desarrollo local
-- NO ejecutar en produccion
-- ============================================================

-- Tenant de prueba
INSERT INTO tenants (id, name, slug, phone, email, whatsapp) VALUES
  (
    ''11111111-1111-1111-1111-111111111111'',
    ''Guayaberas El Yucateco'',
    ''el-yucateco'',
    ''9991234567'',
    ''admin@elyucateco.com'',
    ''529991234567''
  );

-- Plan trial para el tenant de prueba
INSERT INTO tenant_plans (tenant_id, plan_type, status, trial_ends_at) VALUES
  (
    ''11111111-1111-1111-1111-111111111111'',
    ''trial'',
    ''active'',
    NOW() + INTERVAL ''30 days''
  );

-- Configuracion del tenant de prueba
INSERT INTO tenant_settings (tenant_id, currency, timezone, low_stock_threshold) VALUES
  (
    ''11111111-1111-1111-1111-111111111111'',
    ''MXN'',
    ''America/Merida'',
    5
  );
