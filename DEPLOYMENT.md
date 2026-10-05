# Deployment Checklist

## Environment
- [ ] Production environment variables configured
- [ ] MongoDB configured
- [ ] Frontend API URL (`VITE_API_URL`) configured
- [ ] CORS configured (`CORS_ORIGIN` environment variable)
- [ ] NODE_ENV configured (set to 'production')

## Backend
- [ ] Production startup works (`npm start`)
- [ ] Health endpoint works (`/api/health`)
- [ ] Upload works
- [ ] Scan works
- [ ] Review works
- [ ] Redaction works
- [ ] Download works
- [ ] History works

## Frontend
- [ ] Production build succeeds (`npm run build`)
- [ ] Dashboard works
- [ ] Scan page works
- [ ] Review works
- [ ] History works
- [ ] No localhost API dependency

## Security
- [ ] No secrets committed
- [ ] File validation works
- [ ] Path traversal protection works
- [ ] Download protection works
- [ ] CORS configured correctly for production origin
- [ ] Security headers enabled

## Storage
- [ ] Uploaded files persist in MongoDB
- [ ] Protected files persist in MongoDB
- [ ] Original files remain unchanged

## Testing
- [ ] End-to-end workflow passes
- [ ] Dashboard values verified
- [ ] NLP detection verified
- [ ] Redaction verified
