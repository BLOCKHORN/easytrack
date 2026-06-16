-- 1. Borramos las versiones antiguas para limpiar el contrato
DROP FUNCTION IF EXISTS public.admin_get_all_tenants();
DROP FUNCTION IF EXISTS public.admin_get_global_carrier_stats(text);
DROP FUNCTION IF EXISTS public.admin_get_tenant_stats(uuid, text);

-- 2. Instalamos la nueva función: admin_get_all_tenants (Usando fecha_creacion como fallback)
CREATE OR REPLACE FUNCTION public.admin_get_all_tenants()
 RETURNS TABLE(
   id uuid,
   email text,
   nombre_empresa text,
   slug text,
   plan_id text,
   status text,
   fecha_creacion timestamptz,
   trial_quota integer,
   trial_used integer,
   is_ai_active boolean,
   ai_scans_count integer,
   ai_prompt_tokens integer,
   ai_completion_tokens integer,
   total_paquetes bigint,
   ingreso_historico_local numeric,
   mrr_contribution numeric,
   recibidos_hoy bigint,
   entregados_hoy bigint,
   ultima_actividad timestamptz
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    t.id, t.email, t.nombre_empresa, t.slug, t.plan_id, t.status, t.fecha_creacion, 
    t.trial_quota, t.trial_used, t.is_ai_active, t.ai_scans_count, t.ai_prompt_tokens, t.ai_completion_tokens,
    (SELECT COUNT(*) FROM public.packages p WHERE p.tenant_id = t.id) as total_paquetes,
    (SELECT COALESCE(SUM(ingreso_generado), 0) FROM public.packages p WHERE p.tenant_id = t.id AND p.entregado = true) as ingreso_historico_local,
    CASE WHEN t.plan_id = 'pro' THEN 29.90 ELSE 0 END as mrr_contribution,
    (SELECT COUNT(*) FROM public.packages p WHERE p.tenant_id = t.id AND DATE(p.fecha_llegada) = CURRENT_DATE) as recibidos_hoy,
    (SELECT COUNT(*) FROM public.packages p WHERE p.tenant_id = t.id AND p.entregado = true AND DATE(p.fecha_entregado) = CURRENT_DATE) as entregados_hoy,
    t.fecha_creacion as ultima_actividad
  FROM public.tenants t;
END;
$function$;

-- 3. Instalamos la nueva función: admin_get_global_carrier_stats
CREATE OR REPLACE FUNCTION public.admin_get_global_carrier_stats(p_time_range text DEFAULT 'all')
 RETURNS TABLE(
   empresa_transporte text,
   volumen bigint,
   ticket_medio numeric,
   ingreso_total numeric
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.empresa_transporte,
    COUNT(*) as volumen,
    COALESCE(AVG(p.ingreso_generado), 0) as ticket_medio,
    COALESCE(SUM(p.ingreso_generado), 0) as ingreso_total
  FROM public.packages p
  WHERE p.entregado = true
    AND (
      CASE 
        WHEN p_time_range = 'today' THEN (p.fecha_entregado AT TIME ZONE 'Europe/Madrid')::date = CURRENT_DATE
        WHEN p_time_range = 'week' THEN p.fecha_entregado >= NOW() - INTERVAL '7 days'
        WHEN p_time_range = 'month' THEN p.fecha_entregado >= DATE_TRUNC('month', NOW())
        ELSE true
      END
    )
  GROUP BY p.empresa_transporte
  ORDER BY ingreso_total DESC;
END;
$function$;

-- 4. Instalamos la nueva función: admin_get_tenant_stats
CREATE OR REPLACE FUNCTION public.admin_get_tenant_stats(p_tenant_id uuid, p_time_range text DEFAULT 'all')
 RETURNS TABLE(
   empresa_transporte text,
   volumen bigint,
   ticket_medio numeric,
   ingreso_total numeric
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    p.empresa_transporte,
    COUNT(*) as volumen,
    COALESCE(AVG(p.ingreso_generado), 0) as ticket_medio,
    COALESCE(SUM(p.ingreso_generado), 0) as ingreso_total
  FROM public.packages p
  WHERE p.tenant_id = p_tenant_id
    AND p.entregado = true
    AND (
      CASE 
        WHEN p_time_range = 'today' THEN (p.fecha_entregado AT TIME ZONE 'Europe/Madrid')::date = CURRENT_DATE
        WHEN p_time_range = 'week' THEN p.fecha_entregado >= NOW() - INTERVAL '7 days'
        WHEN p_time_range = 'month' THEN p.fecha_entregado >= DATE_TRUNC('month', NOW())
        ELSE true
      END
    )
  GROUP BY p.empresa_transporte
  ORDER BY ingreso_total DESC;
END;
$function$;
