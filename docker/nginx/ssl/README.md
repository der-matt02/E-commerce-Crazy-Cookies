# SSL Certificates

Place your SSL certificates here before running Nginx in production.

Required files:
- `fullchain.pem` — Full certificate chain (cert + intermediates)
- `privkey.pem`   — Private key

## Option A: Let's Encrypt (recommended)

```bash
certbot certonly --standalone -d yourdomain.com
# Then copy:
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem ./fullchain.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem   ./privkey.pem
```

## Option B: Self-signed (local testing only)

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout privkey.pem \
  -out fullchain.pem \
  -subj "/CN=localhost"
```

**Never commit real certificates to the repository.**
