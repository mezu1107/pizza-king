CREATE TABLE public.pizza_options (
  key text PRIMARY KEY CHECK (key ~ '^(crust|top|dip):[a-z0-9_-]{1,40}$'),
  label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 80),
  price numeric NOT NULL DEFAULT 0 CHECK (price >= 0 AND price <= 100000),
  sort integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pizza_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.pizza_options TO authenticated;
GRANT ALL ON public.pizza_options TO service_role;
ALTER TABLE public.pizza_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active pizza options" ON public.pizza_options FOR SELECT USING (active OR public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins insert pizza options" ON public.pizza_options FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update pizza options" ON public.pizza_options FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins delete pizza options" ON public.pizza_options FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE TRIGGER pizza_options_updated BEFORE UPDATE ON public.pizza_options FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.pizza_options(key,label,price,sort) VALUES
 ('crust:pan','Pan Crust',0,1),('crust:thin','Thin & Crispy',50,2),('crust:stuffed','Stuffed Crust',250,3),('crust:crown','Crown Crust',300,4),
 ('top:cheese','Extra Cheese',150,10),('top:chicken','Extra Chicken',180,11),('top:mushroom','Mushrooms',100,12),('top:jalapeno','Jalapenos',80,13),('top:olives','Olives',80,14),('top:onion','Onions',50,15),
 ('dip:garlic','Garlic Mayo Dip',60,20),('dip:ranch','Ranch Dip',70,21),('dip:mustard','Honey Mustard Dip',70,22);

CREATE OR REPLACE FUNCTION public.pizza_option_catalog()
RETURNS TABLE(key text, label text, price numeric, sort integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $$ SELECT o.key, o.label, o.price, o.sort FROM public.pizza_options AS o WHERE o.active $$;
GRANT EXECUTE ON FUNCTION public.pizza_option_catalog() TO anon, authenticated;

CREATE TABLE public.qr_frame_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  frame_style text NOT NULL DEFAULT 'royal' CHECK (frame_style IN ('royal','classic','minimal','custom')),
  headline text NOT NULL DEFAULT 'Scan to Order' CHECK (length(headline) <= 60),
  tagline text NOT NULL DEFAULT 'Fresh, hot & royal pizza' CHECK (length(tagline) <= 80),
  frame_image_url text CHECK (frame_image_url IS NULL OR length(frame_image_url) <= 1000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.qr_frame_settings TO authenticated;
GRANT ALL ON public.qr_frame_settings TO service_role;
ALTER TABLE public.qr_frame_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read qr frame" ON public.qr_frame_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins insert qr frame" ON public.qr_frame_settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins update qr frame" ON public.qr_frame_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
INSERT INTO public.qr_frame_settings(id) VALUES (1);

CREATE POLICY "Admins manage qr frame images" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'qr-frames' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'qr-frames' AND public.has_role(auth.uid(), 'admin'::public.app_role));