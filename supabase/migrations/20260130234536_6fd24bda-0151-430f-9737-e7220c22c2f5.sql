-- Добавить 5 полей payment_url для разных уровней скидки
ALTER TABLE portal_subscriptions ADD COLUMN payment_url_10 text;
ALTER TABLE portal_subscriptions ADD COLUMN payment_url_20 text;
ALTER TABLE portal_subscriptions ADD COLUMN payment_url_30 text;
ALTER TABLE portal_subscriptions ADD COLUMN payment_url_40 text;
ALTER TABLE portal_subscriptions ADD COLUMN payment_url_50 text;

COMMENT ON COLUMN portal_subscriptions.payment_url IS 'URL оплаты без скидки (0%)';
COMMENT ON COLUMN portal_subscriptions.payment_url_10 IS 'URL оплаты со скидкой 10%';
COMMENT ON COLUMN portal_subscriptions.payment_url_20 IS 'URL оплаты со скидкой 20%';
COMMENT ON COLUMN portal_subscriptions.payment_url_30 IS 'URL оплаты со скидкой 30%';
COMMENT ON COLUMN portal_subscriptions.payment_url_40 IS 'URL оплаты со скидкой 40%';
COMMENT ON COLUMN portal_subscriptions.payment_url_50 IS 'URL оплаты со скидкой 50%';