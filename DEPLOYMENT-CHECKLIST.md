# Phase-1 MVP - Deployment Checklist

## Pre-Deployment Verification

### Backend Checks
- [ ] `npm run seed` executes without errors (creates superadmin + permissions)
- [ ] `npm start` backend runs on port 3000
- [ ] All CRUD endpoints tested with curl/Postman
- [ ] Audit logs created for all operations (GET /admin/audit)
- [ ] Permission middleware blocks unauthorized requests (403)
- [ ] Error handling returns meaningful messages

### Frontend Checks
- [ ] `npm run dev` frontend runs on port 5173
- [ ] All pages load without console errors
- [ ] Navigation bar shows all menu items
- [ ] Login flow works
- [ ] Logout clears token

### Feature Verification

#### Products ✅
- [ ] Create product form displays correctly
- [ ] CSV import textarea accepts input
- [ ] Products display in table with pagination
- [ ] Search filters products
- [ ] Delete removes product

#### Orders ✅
- [ ] Orders list shows with status colors
- [ ] Click "View" opens detail modal
- [ ] Modal shows order details, items, timeline
- [ ] Assign rider dropdown works (if has permission)
- [ ] Status update dropdown works (if has permission)

#### Users ✅
- [ ] Create user form works
- [ ] User appears in list after creation
- [ ] Bulk assign button active when users selected
- [ ] Bulk assign modal opens, role dropdown works
- [ ] Audit logs button opens modal with logs
- [ ] Individual role change works

#### Categories ✅
- [ ] Create, edit (inline), delete work
- [ ] Pagination functional

#### Riders ✅ (NEW)
- [ ] Create rider auto-assigns rider role
- [ ] Inline edit works
- [ ] Deactivate/Activate toggles status
- [ ] Delete removes rider

### Permission Tests
- [ ] Superadmin sees all pages
- [ ] Admin sees Users/Products/Orders/Categories
- [ ] Admin cannot see Roles page (if no permission)
- [ ] Rider cannot see Users page
- [ ] Customer cannot see admin pages

### Audit Trail
- [ ] Audit logs show after product create
- [ ] Audit logs show after category edit
- [ ] Audit logs show after order assignment (with riderId)
- [ ] Audit logs show after bulk role assign
- [ ] Logs show actor name, timestamp, action type

---

## Pre-Production Deployment

### 1. Database Setup
```bash
# Ensure MongoDB is running
# Check connection string in .env

# Run seed to create permissions & superadmin
npm run seed
```

### 2. Environment Variables
```bash
# .env (Backend)
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname
JWT_SECRET=your-very-secret-key-here
PORT=3000
NODE_ENV=production
RABBITMQ_URL=amqp://guest:guest@localhost:5672

# .env (Frontend)
VITE_API_URL=https://api.yourdomain.com
```

### 3. Backend Build & Test
```bash
cd backend
npm ci                    # Install exact versions
npm run seed             # Create roles/permissions
npm start               # Test locally
npm run build           # If using TypeScript build step
```

### 4. Frontend Build & Test
```bash
cd admin
npm ci                   # Install exact versions
npm run build           # Builds to dist/
npm run preview         # Preview production build locally
```

### 5. Docker Build (Optional)
```bash
# Backend
docker build -t admin-api:1.0 .
docker run -e MONGO_URI="..." -e JWT_SECRET="..." -p 3000:3000 admin-api:1.0

# Test health check
curl http://localhost:3000/health
```

### 6. Staging Deployment
- [ ] Deploy backend to staging server
- [ ] Deploy frontend to staging
- [ ] Run full test suite against staging
- [ ] Test with real data (not seed data)
- [ ] Performance test (load test with 100+ product import)

---

## Staging Test Cases

### Critical Path Tests
```
1. Create → Read → Update → Delete (all entities)
2. Bulk import 50+ products
3. Assign 10 orders to riders
4. Bulk assign 20 users to role
5. Verify all operations audited
6. Audit logs query returns data quickly
```

### Permission Tests
```
1. Superadmin can do everything
2. Admin cannot assign roles
3. Rider cannot access any admin page
4. Customer sees only dashboard
5. 403 returned on unauthorized API calls
```

### Performance Tests
```
1. Page load < 2 seconds
2. Product list (1000 items) < 1 second
3. Bulk import 100 products < 5 seconds
4. Audit logs query (1000 logs) < 1 second
5. Role assignment (batch of 50 users) < 10 seconds
```

---

## Production Deployment Checklist

### Infrastructure
- [ ] Production database backup configured
- [ ] Database indices created (audit.resourceId, audit.createdAt)
- [ ] Monitoring & logging configured (Sentry, DataDog, etc.)
- [ ] HTTPS/SSL certificates configured
- [ ] Rate limiting configured
- [ ] CORS settings configured for frontend domain

### Security
- [ ] JWT secret is strong (32+ chars, random)
- [ ] MONGO_URI uses authentication
- [ ] No API keys exposed in frontend code
- [ ] HTTPS enforced on all endpoints
- [ ] Helmet middleware configured
- [ ] CORS whitelist set
- [ ] Admin panel behind VPN or IP whitelist (optional)

### Backups & Recovery
- [ ] Database daily backups configured
- [ ] Backup retention policy (30 days minimum)
- [ ] Tested restore from backup
- [ ] Disaster recovery plan documented

### Monitoring
- [ ] Error tracking (Sentry/DataDog) configured
- [ ] Performance monitoring configured
- [ ] Uptime monitoring (Pingdom/StatusCake) configured
- [ ] Alert notifications configured (email/Slack)

### Documentation
- [ ] README.md updated with deployment instructions
- [ ] API documentation (ALL_APIS_CURL.md) current
- [ ] Runbook for common tasks created
- [ ] Incident response plan documented

---

## Post-Deployment

### 1. Verify Production
```bash
# Check backend health
curl https://api.yourdomain.com/health

# Check frontend loads
curl https://yourdomain.com

# Test login
# Admin dashboard accessible
# All pages load
```

### 2. Monitor Logs
```bash
# Check for errors
tail -f /var/log/admin-api.log

# Check database
db.audits.find().limit(5)

# Check permissions
db.roles.find()
```

### 3. Announce Deployment
- [ ] Notify team deployment complete
- [ ] Share access credentials (securely)
- [ ] Document known limitations
- [ ] Share runbook link

### 4. Scheduled Tasks
- [ ] Daily backup verification
- [ ] Weekly database optimization
- [ ] Monthly security audit
- [ ] Quarterly performance review

---

## Rollback Plan

If issues found in production:

```bash
# 1. Keep previous version running in parallel
# 2. Switch traffic back to previous version
# 3. Investigate issue
# 4. Deploy fix to staging
# 5. Re-deploy to production

# Docker example:
docker run -e MONGO_URI="..." -e JWT_SECRET="..." -p 3000:3000 admin-api:0.9  # Old version
```

---

## Success Metrics

After deployment, track:
- [ ] Zero critical errors (first week)
- [ ] Page load < 2 seconds
- [ ] API response < 500ms
- [ ] Audit logs capture 100% of admin actions
- [ ] No 500 errors
- [ ] No 403 errors on authorized requests
- [ ] All pages render correctly
- [ ] Mobile responsive (if needed)

---

## Issue Resolution

### Issue: "MongoDB connection failed"
**Fix**: Check MONGO_URI env var, ensure network whitelist includes server IP

### Issue: "Token invalid or expired"
**Fix**: Check JWT_SECRET matches between backend and frontend stored token

### Issue: "Permission denied" for superadmin
**Fix**: Check seed ran successfully, verify roles/permissions in DB

### Issue: "Audit logs endpoint returns 500"
**Fix**: Check audit collection exists, run `db.createCollection("audits")`

### Issue: "CSV import hangs"
**Fix**: Check database connection, verify bulk write limits not exceeded

---

## Maintenance

### Daily
- Monitor error logs
- Check database backup completion
- Verify no critical alerts

### Weekly
- Review audit logs for anomalies
- Check performance metrics
- Database optimization (if needed)

### Monthly
- Security audit (check permission assignments)
- Performance review (query optimization)
- User access review (remove unused accounts)

### Quarterly
- Full security assessment
- Capacity planning
- Feature planning for next phase

---

## Support Contacts

- **Backend Issues**: Check backend logs, verify database connectivity
- **Frontend Issues**: Check browser console, verify API endpoint
- **Database Issues**: Check MongoDB connection, verify storage
- **Permission Issues**: Check seed script, verify user role

---

## Sign-Off

- [ ] Product Owner approves production deployment
- [ ] DevOps confirms infrastructure ready
- [ ] QA completes testing
- [ ] Stakeholders notified
- [ ] Deployment date scheduled

**Date Deployed**: ___________  
**Deployed By**: ___________  
**Verified By**: ___________  

---

**Ready for Production! 🚀**

