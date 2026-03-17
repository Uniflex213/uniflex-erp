-- Add "creation_utilisateur" SMTP config for welcome emails sent during user creation
INSERT INTO email_smtp_configs (config_key, label, from_name)
VALUES ('creation_utilisateur', 'Création d''utilisateur', 'Uniflex ERP')
ON CONFLICT (config_key) DO NOTHING;
