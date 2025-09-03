import { Router } from 'express';
import { contactController, contactFormController } from '@/controllers/contact';

export const contactRouter = Router();

// Contact page
contactRouter.get('/', contactController);

// Contact form submission
contactRouter.post('/submit', contactFormController);
