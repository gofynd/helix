/**
 * Policy pages routes
 * Routes for legal information pages
 */

import { Router } from 'express';
import {
  termsAndConditionsController,
  returnPolicyController,
  shippingPolicyController,
  privacyPolicyController
} from '@/controllers/policies';

export const policiesRouter = Router();

// Terms and Conditions
policiesRouter.get('/terms-and-conditions', termsAndConditionsController);
policiesRouter.get('/terms', termsAndConditionsController); // Alias

// Return Policy
policiesRouter.get('/return-policy', returnPolicyController);
policiesRouter.get('/returns', returnPolicyController); // Alias

// Shipping Policy  
policiesRouter.get('/shipping-policy', shippingPolicyController);
policiesRouter.get('/shipping', shippingPolicyController); // Alias

// Privacy Policy
policiesRouter.get('/privacy-policy', privacyPolicyController);
policiesRouter.get('/privacy', privacyPolicyController); // Alias
