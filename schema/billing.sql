--
-- Billing tables: plans, subscriptions, invoices, payment_gateways
-- All follow the (id, cid, data jsonb) pattern
--

CREATE TABLE IF NOT EXISTS plans (
    id text NOT NULL,
    cid text,
    data jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE ONLY plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS plans_cid_idx ON plans USING btree (cid);
CREATE INDEX IF NOT EXISTS plans_data_slug_idx ON plans USING btree ((data->>'slug'));
CREATE INDEX IF NOT EXISTS plans_data_active_idx ON plans USING btree (((data->>'active')::boolean));

CREATE TABLE IF NOT EXISTS subscriptions (
    id text NOT NULL,
    cid text,
    data jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE ONLY subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS subscriptions_cid_idx ON subscriptions USING btree (cid);
CREATE INDEX IF NOT EXISTS subscriptions_data_company_id_idx ON subscriptions USING btree ((data->>'company_id'));
CREATE INDEX IF NOT EXISTS subscriptions_data_status_idx ON subscriptions USING btree ((data->>'status'));

CREATE TABLE IF NOT EXISTS invoices (
    id text NOT NULL,
    cid text,
    data jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE ONLY invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS invoices_cid_idx ON invoices USING btree (cid);
CREATE INDEX IF NOT EXISTS invoices_data_company_id_idx ON invoices USING btree ((data->>'company_id'));
CREATE INDEX IF NOT EXISTS invoices_data_subscription_id_idx ON invoices USING btree ((data->>'subscription_id'));
CREATE INDEX IF NOT EXISTS invoices_data_status_idx ON invoices USING btree ((data->>'status'));

CREATE TABLE IF NOT EXISTS payment_gateways (
    id text NOT NULL,
    cid text,
    data jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE ONLY payment_gateways
    ADD CONSTRAINT payment_gateways_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS payment_gateways_cid_idx ON payment_gateways USING btree (cid);
CREATE INDEX IF NOT EXISTS payment_gateways_data_type_idx ON payment_gateways USING btree ((data->>'type'));

-- Contact messages from marketing site
CREATE TABLE IF NOT EXISTS contact_messages (
    id text NOT NULL,
    cid text,
    data jsonb DEFAULT '{}'::jsonb NOT NULL
);

ALTER TABLE ONLY contact_messages
    ADD CONSTRAINT contact_messages_pkey PRIMARY KEY (id);

CREATE INDEX IF NOT EXISTS contact_messages_cid_idx ON contact_messages USING btree (cid);
CREATE INDEX IF NOT EXISTS contact_messages_data_created_idx ON contact_messages USING btree ((data->>'created') DESC);
CREATE INDEX IF NOT EXISTS contact_messages_data_status_idx ON contact_messages USING btree ((data->>'status'));
