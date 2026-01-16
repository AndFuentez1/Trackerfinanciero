-- Add PIN field to profiles table for alternative login
ALTER TABLE public.profiles 
ADD COLUMN pin_hash TEXT DEFAULT NULL;

-- Note: PIN will be hashed on the client side before storing