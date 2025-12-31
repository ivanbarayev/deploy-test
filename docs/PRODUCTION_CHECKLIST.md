# NowPayments Webhook Production Checklist

Use this checklist before deploying your NowPayments webhook integration to production.

## ☐ Environment Configuration

- [ ] Production API key configured (`NOWPAYMENTS_API_KEY`)
- [ ] IPN Secret configured (`NOWPAYMENTS_IPN_SECRET`)
- [ ] `NODE_ENV=production` set
- [ ] Environment variables validated using `~/env.ts`
- [ ] Environment variables added to hosting provider (Vercel, etc.)
- [ ] Sandbox mode disabled in production

## ☐ NowPayments Dashboard Setup

- [ ] Production webhook URL configured: `https://yourdomain.com/api/webhooks/nowpayments`
- [ ] Webhook URL uses HTTPS (required)
- [ ] IPN Secret copied from dashboard
- [ ] Test payment made in sandbox and verified
- [ ] API key has correct permissions

## ☐ Security

- [ ] Webhook signature verification enabled
- [ ] HTTPS certificate valid and not expired
- [ ] Firewall allows NowPayments IP addresses
- [ ] Rate limiting configured on webhook endpoint
- [ ] No sensitive data logged in production
- [ ] Error messages don't leak internal details

## ☐ Code Quality

- [ ] All TypeScript errors resolved
- [ ] ESLint warnings addressed
- [ ] Database integration implemented
- [ ] Handlers use async/await for DB operations
- [ ] Proper error handling in all handlers
- [ ] Idempotency checks implemented (prevent duplicate processing)

## ☐ Database Integration

- [ ] Payment webhook table created
- [ ] Payment status tracking implemented
- [ ] User balance/credits update logic added
- [ ] Order fulfillment logic implemented
- [ ] Transaction logging enabled
- [ ] Database indexes created for performance
- [ ] Backup strategy in place

## ☐ Monitoring & Logging

- [ ] Webhook receipt logging enabled
- [ ] Payment status changes logged
- [ ] Error tracking configured (Sentry, etc.)
- [ ] Success rate monitoring set up
- [ ] Alert for webhook failures
- [ ] Alert for signature verification failures
- [ ] Dashboard for payment metrics

## ☐ Testing

- [ ] Local testing completed with test script
- [ ] Sandbox testing with real NowPayments webhooks
- [ ] All payment statuses tested:
  - [ ] `finished`
  - [ ] `failed`
  - [ ] `expired`
  - [ ] `partially_paid`
  - [ ] `refunded`
- [ ] Invalid signature handling tested
- [ ] Duplicate webhook handling tested
- [ ] Edge cases handled (missing fields, etc.)

## ☐ Business Logic

- [ ] Order fulfillment logic implemented
- [ ] User notification system integrated (email/SMS)
- [ ] Credit/balance update logic working
- [ ] Refund handling process defined
- [ ] Partial payment policy decided
- [ ] Customer support process documented

## ☐ Performance

- [ ] Webhook responds within 30 seconds
- [ ] Heavy processing moved to background jobs
- [ ] Database queries optimized
- [ ] Connection pooling configured
- [ ] Caching implemented where appropriate

## ☐ Documentation

- [ ] Internal docs updated with webhook flow
- [ ] Customer support docs updated
- [ ] Runbook created for common issues
- [ ] Team trained on webhook system
- [ ] Emergency contacts documented

## ☐ Compliance & Legal

- [ ] Payment data retention policy defined
- [ ] GDPR/data privacy requirements met
- [ ] Terms of service updated
- [ ] Privacy policy updated
- [ ] User consent flows implemented

## ☐ Deployment

- [ ] Production deployment tested in staging
- [ ] Rollback plan prepared
- [ ] Database migrations applied
- [ ] Environment variables set in production
- [ ] Health check endpoint working
- [ ] Monitoring dashboards ready
- [ ] On-call rotation scheduled

## ☐ Post-Deployment

- [ ] Monitor first few payments closely
- [ ] Verify webhook receipt logs
- [ ] Check error rates
- [ ] Confirm order fulfillment working
- [ ] Verify user notifications sent
- [ ] Review customer support tickets
- [ ] Performance metrics within expected range

## ☐ Maintenance

- [ ] Regular security updates scheduled
- [ ] Dependency updates automated
- [ ] Webhook logs regularly reviewed
- [ ] Failed payment reports reviewed
- [ ] Monthly metrics review scheduled

---

## 🚨 Critical Items (Must Have)

These items are **critical** and must be completed:

1. ✅ HTTPS enabled and working
2. ✅ Signature verification enabled
3. ✅ Database integration complete
4. ✅ Error tracking configured
5. ✅ Idempotency implemented
6. ✅ Production webhook URL set in dashboard

---

## 📋 Pre-Launch Test Script

Run this before going live:

```bash
# 1. Check environment
echo "API Key: ${NOWPAYMENTS_API_KEY:0:10}..."
echo "IPN Secret: ${NOWPAYMENTS_IPN_SECRET:0:10}..."
echo "Node Env: $NODE_ENV"

# 2. Test webhook endpoint
curl -X POST https://yourdomain.com/api/webhooks/nowpayments \
  -H "Content-Type: application/json" \
  -H "x-nowpayments-sig: test" \
  -d '{"payment_id":1,"payment_status":"test"}'

# 3. Check logs
# Verify webhook was received and logged

# 4. Small test payment
# Create a small real payment to test end-to-end
```

---

## 🎯 Success Criteria

Your integration is production-ready when:

- ✅ Test payments complete successfully
- ✅ Webhooks are received and processed
- ✅ Orders are fulfilled automatically
- ✅ Users receive confirmation emails
- ✅ No errors in last 24 hours of testing
- ✅ All team members trained
- ✅ Monitoring shows healthy metrics

---

## 📞 Emergency Contacts

**Add your contacts here:**

- Development Team Lead: _____________
- DevOps/Infrastructure: _____________
- NowPayments Support: support@nowpayments.io
- On-Call Engineer: _____________

---

## 🔄 Regular Maintenance Schedule

- **Daily**: Check error logs
- **Weekly**: Review payment metrics
- **Monthly**: Security audit
- **Quarterly**: Dependency updates
- **Annually**: Full system review

---

**Last Updated**: [Date]  
**Reviewed By**: [Name]  
**Next Review**: [Date]

---

## ✅ Sign-Off

- [ ] Tech Lead Approval: _____________ Date: _______
- [ ] Security Review: _____________ Date: _______
- [ ] Product Owner: _____________ Date: _______
- [ ] Operations: _____________ Date: _______

---

**Status**: ⬜ Not Started | 🟡 In Progress | 🟢 Ready for Production

**Good luck with your launch! 🚀**

