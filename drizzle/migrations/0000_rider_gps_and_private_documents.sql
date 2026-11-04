CREATE TABLE public.rider_gps_points (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), rider_id uuid NOT NULL, order_id uuid NOT NULL REFERENCES public.orders(id), lat double precision NOT NULL, lng double precision NOT NULL, accuracy double precision NOT NULL, recorded_at timestamptz NOT NULL DEFAULT now(), segment_km double precision NOT NULL DEFAULT 0);
GRANT SELECT ON public.rider_gps_points TO authenticated;
GRANT ALL ON public.rider_gps_points TO service_role;
ALTER TABLE public.rider_gps_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own GPS or admin" ON public.rider_gps_points FOR SELECT TO authenticated USING (rider_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX rider_gps_order_time ON public.rider_gps_points(order_id, recorded_at DESC);
CREATE INDEX rider_gps_rider_time ON public.rider_gps_points(rider_id, recorded_at DESC);
CREATE OR REPLACE FUNCTION public.record_rider_gps(_order_id uuid, _lat double precision, _lng double precision, _accuracy double precision) RETURNS double precision LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders; prev public.rider_gps_points; km double precision := 0; secs double precision; current_km double precision;
BEGIN
 IF NOT public.has_role(auth.uid(), 'rider') THEN RAISE EXCEPTION 'Rider access required'; END IF;
 SELECT * INTO o FROM public.orders WHERE id = _order_id AND rider_id = auth.uid() AND status IN ('out_for_delivery', 'out for delivery') FOR UPDATE;
 IF o.id IS NULL THEN RAISE EXCEPTION 'No active delivery assigned'; END IF;
 IF _lat IS NULL OR _lng IS NULL OR _accuracy IS NULL OR NOT (_lat BETWEEN -90 AND 90) OR NOT (_lng BETWEEN -180 AND 180) OR NOT (_accuracy BETWEEN 0 AND 50) THEN RAISE EXCEPTION 'Waiting for an accurate GPS location'; END IF;
 SELECT * INTO prev FROM public.rider_gps_points WHERE order_id = _order_id ORDER BY recorded_at DESC LIMIT 1;
 IF prev.id IS NOT NULL THEN
  secs := extract(epoch FROM now() - prev.recorded_at);
  IF secs < 5 THEN RETURN coalesce(o.distance_km, 0); END IF;
  km := 6371 * 2 * asin(sqrt(least(1.0, power(sin(radians(_lat-prev.lat)/2),2) + cos(radians(prev.lat))*cos(radians(_lat))*power(sin(radians(_lng-prev.lng)/2),2))));
  IF secs > 120 OR km < greatest(0.015, least(_accuracy, prev.accuracy)/1000) THEN km := 0; END IF;
  IF km > 0 AND km / secs * 3600 > 120 THEN RAISE EXCEPTION 'GPS jump ignored'; END IF;
 END IF;
 INSERT INTO public.rider_gps_points(rider_id, order_id, lat, lng, accuracy, segment_km) VALUES(auth.uid(), _order_id, _lat, _lng, _accuracy, km);
 UPDATE public.orders SET distance_km = coalesce(distance_km, 0) + km WHERE id = _order_id RETURNING distance_km INTO current_km;
 RETURN current_km;
END $$;
REVOKE ALL ON FUNCTION public.record_rider_gps(uuid, double precision, double precision, double precision) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_rider_gps(uuid, double precision, double precision, double precision) TO authenticated;
ALTER TABLE public.rider_documents ADD COLUMN IF NOT EXISTS storage_path text;
CREATE POLICY "Private rider document reads" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'rider-documents' AND (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'rider') AND (storage.foldername(name))[1] = auth.uid()::text)));
CREATE POLICY "Private rider document uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'rider-documents' AND (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'rider') AND (storage.foldername(name))[1] = auth.uid()::text)));
CREATE POLICY "Private rider document delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'rider-documents' AND (public.has_role(auth.uid(), 'admin') OR (public.has_role(auth.uid(), 'rider') AND (storage.foldername(name))[1] = auth.uid()::text)));
CREATE OR REPLACE FUNCTION public.guard_rider_document_status() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF public.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL THEN RETURN NEW; END IF;
 IF TG_OP = 'INSERT' THEN NEW.status := 'pending';
 ELSIF NEW.status IS DISTINCT FROM OLD.status OR NEW.rider_id IS DISTINCT FROM OLD.rider_id THEN RAISE EXCEPTION 'Only admins can approve documents';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER guard_rider_document_status BEFORE INSERT OR UPDATE ON public.rider_documents FOR EACH ROW EXECUTE FUNCTION public.guard_rider_document_status();